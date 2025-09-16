jsPsych.plugins["findSquares_replay_2players"] = (function() {

    var plugin = {};

    plugin.info = {
        name: 'findSquares_replay_2players',

        parameters: {
            grid: {
                type: jsPsych.plugins.parameterType.INT,
                pretty_name: "Grid",
                default: [
                    ['0', '0', '0', '0', '0'],
                    ['A', 'A', 'A', '0', '0'],
                    ['0', '0', '0', '0', '0'],
                    ['0', '0', '0', 'B', '0'],
                    ['C', 'C', '0', 'B', '0']
                ],
                description: "Grid. 0 means water, everything else is a ship."
            },
            end_screen_time: {
                type: jsPsych.plugins.parameterType.INT,
                pretty_name: 'end screen time',
                default: 2000,
                description: 'For how many milliseconds is the end screen presented?'
            },
            text: {
                type: jsPsych.plugins.parameterType.STRING,
                pretty_name: 'text',
                default: `To win, you need to sink one 3-square submarine
and two 2-square patrol boats.`,
                description: 'Text to display on top of grid.'
            },
            description: {
                type: jsPsych.plugins.parameterType.STRING,
                pretty_name: 'description',
                default: {
                    right: `Replaying player 2's game:`,
                    left: `Replaying Player 1's game`
                },
                description: 'Description'
            },
            click_log: {
                type: jsPsych.plugins.parameterType.OBJECT,
                pretty_name: 'click_log',
                default: {
                    'right': {
                        "i": [1, 2, 3, 1, 1, 2, 2, 3, 2, 3, 3, 4, 4, 4],
                        "j": [0, 0, 0, 1, 2, 3, 4, 4, 2, 3, 2, 3, 1, 0],
                        "t": [3559, 3906, 4284, 5152, 6111, 7086, 7696, 7993, 8532, 9145, 9580, 10129, 11173.5, 11552],
                        "hit": ["A", "0", "0", "A", "A", "0", "0", "0", "0", "B", "0", "B", "C", "C"]
                    },
                    "left": {
                        "i": [1, 2, 1, 2, 1, 0, 1, 3, 3, 4, 4, 4, 4],
                        "j": [3, 3, 2, 2, 1, 2, 0, 2, 3, 3, 2, 1, 0],
                        "t": [1439, 1932.5, 4361, 4998, 5583, 6664, 7382, 8805, 9230, 10242, 11254.5, 12390, 13410],
                        "hit": ["0", "0", "A", "0", "A", "0", "A", "0", "B", "B", "0", "C", "C"]
                    }
                },
                description: 'Click log'
            },
            pause_before_first_click: {
              type: jsPsych.plugins.parameterType.INT,
              pretty_name: 'pause before first click',
              default: undefined,
              description: `Time between clicking the play button and the first
              click playing, in seconds. if undefined, use whatever time it took
              the subject to actually click the first click.`
            },
          click_on_pretender: {
            type: jsPsych.plugins.parameterType.BOOL,
            pretty_name: 'click on pretender',
            default: true,
            description: `If true, participant clicks on who they think had hints.
            if false, on who had no hints.`
          }
        }
    }

    plugin.trial = function(display_element, trial) {

      console.log(trial.click_on_pretender)

        display_element.innerHTML = '';

        //open a p5 sketch
        let sketch = function(p) {

            const du = p.min([window.innerWidth, window.innerHeight]) * 2 / 5 //drawing unit
            const left_margin = p.round((window.innerWidth - window.innerHeight) / 2);
            const top_margin = p.round((window.innerHeight - du) * 2 / 5);
            const square_size = Math.floor(du / trial.grid.length);
            const colors = {
                'white': p.color(100, 155, 200),
                'unknown': p.color(255, 230, 166),
                'black': p.color(200, 50, 55)
            }
            var grid_state = trial.grid.map(([...rest]) => rest.map(x => 'unknown'));
            const num_nonzero = trial.grid.flat().reduce((a, b) => a + (b == '0' ? 0 : 1), 0);
            var hits = 0;;
            var last_click_time = p.millis()
            var click_number = 0;
            var replay_log = [];
            var playing_side = 'waiting_for_input';
            var starting_time = p.millis();
            var played_left = false;
            var played_right = false;

            // if pause_before_first_click is defined, start the first click then.
            if (trial.pause_before_first_click != undefined) {
              var first_click_timing_right = trial.click_log.right.t[0];
              trial.click_log.right.t = trial.click_log.right.t.map(
                x=>x-first_click_timing_right+trial.pause_before_first_click
              );

              var first_click_timing_left = trial.click_log.left.t[0];
              trial.click_log.left.t = trial.click_log.left.t.map(
                x=>x-first_click_timing_left+trial.pause_before_first_click
              )
            }

            trial.click_log.right.t.push(Infinity);
            trial.click_log.left.t.push(Infinity);

            function grid_coordinates_to_screen_coordinates(i, j, which_grid) {

                if (which_grid == 'left') {
                    x = left_margin + j * square_size + Math.round(square_size / 2);
                    y = top_margin + i * square_size + Math.round(square_size / 2);
                } else if (which_grid == 'right') {
                    x = left_margin + du * 1.5 + j * square_size + Math.round(square_size / 2);
                    y = top_margin + i * square_size + Math.round(square_size / 2);
                } else if (which_grid == 'center') {
                    x = p.round(window.innerWidth / 2 - du / 4) + j * square_size / 2 + Math.round(square_size / 4);
                    y = i * square_size / 2 + Math.round(square_size / 4);
                }
                return ({
                    x: x,
                    y: y
                })
            }

            // function screen_coordinates_to_grid_coordinates(x,y) {
            // 	i = Math.floor((y-top_margin)/square_size);
            // 	j = Math.floor((x-left_margin)/square_size);
            // 	return({i:i,j:j})
            // }

            function msToTime(duration) {
                var milliseconds = Math.floor((duration % 1000) / 10),
                    seconds = Math.floor((duration / 1000) % 60),
                    minutes = Math.floor((duration / (1000 * 60)) % 60),
                    hours = Math.floor((duration / (1000 * 60 * 60)) % 24);

                hours = (hours < 10) ? "0" + hours : hours;
                minutes = (minutes < 10) ? "0" + minutes : minutes;
                seconds = (seconds < 10) ? "0" + seconds : seconds;
                milliseconds = (milliseconds < 10) ? "0" + milliseconds : milliseconds;
                return hours + ":" + minutes + ":" + seconds + ":" + milliseconds;
            }

            // p.preload = function() {
            //     img = p.loadImage('assets/hit.png');
            // }

            //sketch setup
            p.setup = function() {

                p.createCanvas(p.windowWidth, p.windowHeight);
                p.strokeWeight(0);
                p.frameRate(trial.frame_rate);
                p.rectMode(p.CENTER)
                p.imageMode(p.CENTER)
            }

            //organize everything in one sequence
            p.draw = function() {

                p.background(255);

                // Display true positions
                for (var i = 0; i < trial.grid.length; i++) {
                    for (var j = 0; j < trial.grid.length; j++) {
                        xy = grid_coordinates_to_screen_coordinates(i, j, 'center');
                        p.fill(trial.grid[i][j] == '0' ? colors['white'] : colors['black']);
                        p.stroke(255);
                        p.strokeWeight(1)
                        p.square(xy.x, xy.y, square_size / 2);
                    }
                }

                // emulate clicks
                if (playing_side != 'waiting_for_input') {
                    if (p.millis() - starting_time >= trial.click_log[playing_side].t[click_number]) {
                        ij = {
                            i: trial.click_log[playing_side].i[click_number],
                            j: trial.click_log[playing_side].j[click_number]
                        };
                        if (trial.grid[ij.i][ij.j] == '0') {
                            grid_state[ij.i][ij.j] = 'white'
                        } else {
                            grid_state[ij.i][ij.j] = 'black';
                            hits += 1;
                        }
                        last_click_time = p.millis();
                        click_number = click_number + 1
                    }
                }

                // Description
                if (playing_side != 'waiting_for_input') {
                    p.push()
                    p.textFont("monospace", 15)
                    text = trial.description[playing_side] + ' ' + msToTime(p.millis() - starting_time);
                    p.textAlign(p.Left, p.TOP)
                    p.fill(100);
                    p.strokeWeight(0)
                    p.text(text, playing_side == 'left' ? left_margin : left_margin + du * 1.5, top_margin + du + 20)
                    p.pop()
                }

                for (var i = 0; i < trial.grid.length; i++) {
                    for (var j = 0; j < trial.grid.length; j++) {

                        xy = grid_coordinates_to_screen_coordinates(i, j, 'left');
                        p.fill(playing_side == 'left' ? colors[grid_state[i][j]] : colors['unknown']);
                        p.stroke(127, 182, 177);
                        p.strokeWeight(1)
                        p.square(xy.x, xy.y, square_size);
                        // if (playing_side == 'left' & grid_state[i][j] == 'black') {
                        //     mark_hit(xy.x, xy.y, square_size / 2)
                        // }

                        xy = grid_coordinates_to_screen_coordinates(i, j, 'right');
                        p.fill(playing_side == 'right' ? colors[grid_state[i][j]] : colors['unknown']);
                        p.stroke(127, 182, 177);
                        p.strokeWeight(1)
                        p.square(xy.x, xy.y, square_size);
                        // if (playing_side == 'right' & grid_state[i][j] == 'black') {
                        //     mark_hit(xy.x, xy.y, square_size / 2)
                        // }

                    }
                }

                if (hits < num_nonzero) {
                    // 					var text =
                    // `You clicked on ${click_log.t.length} squares.
                    // ${trial.text}`
                    // 					p.textSize(15)
                    // 					p.push()
                    // 					p.textAlign(p.Left, p.TOP)
                    // 					p.fill(0);
                    // 					p.strokeWeight(0)
                    // 					// p.text(text,left_margin,top_margin-70)
                    // 					p.pop()
                } else if (p.millis() - last_click_time < trial.end_screen_time) {
                    for (var i = 0; i < trial.grid.length; i++) {
                        for (var j = 0; j < trial.grid.length; j++) {
                            if (trial.grid[i][j] != '0') {
                                xy = grid_coordinates_to_screen_coordinates(i, j, playing_side);
                                water_height = square_size *
                                    (p.millis() - last_click_time) / trial.end_screen_time;
                                p.push()
                                p.rectMode(p.CORNERS)
                                p.fill(colors['white'])
                                p.rect(xy.x - square_size / 2,
                                    xy.y + square_size / 2 - water_height,
                                    xy.x + square_size / 2,
                                    xy.y + square_size / 2);
                                p.pop()
                            }
                        }
                    }
                } else if (playing_side != 'waiting_for_input') {
                    for (var i = 0; i < trial.grid.length; i++) {
                        for (var j = 0; j < trial.grid.length; j++) {
                            if (trial.grid[i][j] != '0') {
                                xy = grid_coordinates_to_screen_coordinates(i, j, playing_side);
                                water_height = square_size *
                                    (p.millis() - last_click_time) / trial.end_screen_time;
                                p.push()
                                p.rectMode(p.CORNERS)
                                p.fill(colors['white'])
                                p.rect(xy.x - square_size / 2,
                                    xy.y + square_size / 2 - water_height,
                                    xy.x + square_size / 2,
                                    xy.y + square_size / 2);
                                p.pop()
                            }
                        }
                    }
                    if (playing_side == 'right') {
                        played_right = true;
                    } else if (playing_side == 'left') {
                        played_left = true;
                    }
                    playing_side = 'waiting_for_input';
                }

                var text =
                    `Press 1 to see the game of the left player, or 2 to see the game of the right player.
${(played_right & played_left)? `When you are ready to decide, click on the board of the player ${trial.click_on_pretender? 'who had hints' : 'who had no hints'}.` : ''}`
                p.textSize(20)
                p.push()
                p.textAlign(p.CENTER, p.TOP)
                p.fill(0);
                p.strokeWeight(0)
                p.text(text, window.innerWidth / 2, top_margin + du + 50)
                p.pop();

                if (played_left & played_right &
                    p.mouseY > top_margin & p.mouseY < top_margin + du) {
                      if (p.mouseX > left_margin & p.mouseX < left_margin + du) {
                        var xposition = left_margin+du/2;
                      } else if (p.mouseX > left_margin + du * 1.5 & p.mouseX < left_margin + du * 2.5) {
                        var xposition = left_margin + du * 2;
                      } else {
                        var xposition = undefined;
                      }
                    if (xposition !=undefined) {
                      p.push();
                      p.fill(255,255,255,128);
                      p.stroke(0);
                      p.strokeWeight(4);
                      p.rect(xposition, top_margin+du/2, du, du);
                      p.pop()
                      p.push()
                      p.textAlign(p.CENTER, p.CENTER)
                      p.fill(0);
                      p.strokeWeight(0)
                      p.textSize(40);
                      p.text(trial.click_on_pretender? 'I think this player had hints' : 'I think this player had no hints',
                      xposition, top_margin+du/2, du, du)
                      p.pop();
                    }
                }
            }

            // mark_hit = function(x, y, size) {
            //     p.image(img, x, y, size, size);
            // }

            p.keyPressed = function() {
                if ((p.keyCode == 49 | p.keyCode==97) & playing_side == 'waiting_for_input') {
                    playing_side = 'left';
                    starting_time = p.millis();
                    hits = 0;
                    last_click_time = p.millis()
                    click_number = 0;
                    replay_log.push('left')
                    grid_state = trial.grid.map(([...rest]) => rest.map(x => 'unknown'));
                } else if ((p.keyCode == 50 | p.keyCode==98) & playing_side == 'waiting_for_input') {
                    playing_side = 'right';
                    starting_time = p.millis();
                    hits = 0;;
                    last_click_time = p.millis()
                    click_number = 0;
                    replay_log.push('right')
                    grid_state = trial.grid.map(([...rest]) => rest.map(x => 'unknown'));
                }
            };



            p.mouseClicked = function() {
                if (played_left & played_right &
                    p.mouseY > top_margin & p.mouseY < top_margin + du) {
                    if (p.mouseX > left_margin & p.mouseX < left_margin + du) {
                      // regardless of whether the participant is asked to click
                      // on the board of the player who had or had no hints, the
                      // decision is recorded as the player who was believed
                      // to have had hints.
                        decision = trial.click_on_pretender? 'left' : 'right';
                        p.remove()
                        // data saving
                        var trial_data = {
                            grid: trial.grid,
                            replay_log: replay_log,
                            decision: decision
                        };
                        // end trial
                        jsPsych.finishTrial(trial_data);
                    } else if (p.mouseX > left_margin + du * 1.5 & p.mouseX < left_margin + du * 2.5) {
                      // regardless of whether the participant is asked to click
                      // on the board of the player who had or had no hints, the
                      // decision is recorded as the player who was believed
                      // to have had hints.
                        decision = trial.click_on_pretender? 'right' : 'left';
                        p.remove()
                        // data saving
                        var trial_data = {
                            grid: trial.grid,
                            replay_log: replay_log,
                            decision: decision
                        };
                        console.log(trial_data)
                        // end trial
                        jsPsych.finishTrial(trial_data);
                    }
                }
            }
        };

        // start sketch!
        let myp5 = new p5(sketch);

    }

    //Return the plugin object which contains the trial
    return plugin;
})();
