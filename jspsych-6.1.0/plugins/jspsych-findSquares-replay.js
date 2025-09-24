jsPsych.plugins["findSquares_replay"] = (function() {

	var plugin = {};

	plugin.info = {
		name: 'findSquares_replay',

		parameters: {
			grid: {
				type: jsPsych.plugins.parameterType.INT,
				pretty_name: "Grid",
				default: [
							
					['0', '0', '0', '0', '0', '0'],
					['0', '1', '0', '0', '0', '0'],
					['0', '1', '0', '0', '0', '0'],
					['0', '1', '0', '0', '0', '0'],
					['0', '1', '0', '0', '0', '0'],
					['0', '0', '0', '0', '0', '0']
				],
				description: "Grid. 0 means white, 1 is a hit."
			},
			cheat: {
				type: jsPsych.plugins.parameterType.BOOL,
				pretty_name:'cheat',
				default: false,
				description: 'When true, participants see the position.'
			},
			end_screen_time: {
				type: jsPsych.plugins.parameterType.INT,
				pretty_name:'end screen time',
				default: 2000,
				description: 'For how many milliseconds is the end screen presented?'
			},
		 text: {
			 type: jsPsych.plugins.parameterType.STRING,
			 pretty_name:'text',
			 default:
			 `Find the rest of the hidden black cards.`,
			 description: 'Text to display on top of grid.'
		 },
		 participant_number: {
			 type: jsPsych.plugins.parameterType.STRING,
			 pretty_name:'text',
			 default:
			 `0`
		 },
		 board_number: {
			 type: jsPsych.plugins.parameterType.STRING,
			 pretty_name:'text',
			 default:
			 `0`
		 },
		 click_log: {
			 type: jsPsych.plugins.parameterType.OBJECT,
			 pretty_name:'click_log',
			 default: {"i":[1,2,3,1,1,2,2,3,2,3,3,4,4,4],
			 "j":[0,0,0,1,2,3,4,4,2,3,2,3,1,0],
			 "t":[3559,3906,4284,5152,6111,7086,7696,7993,8532,9145,9580,10129,11173.5,11552],
			 "hit":["A","0","0","A","A","0","0","0","0","B","0","B","C","C"]},
			 "b":[0,0,0,,1,1,1,1,1,1,1,1,1,1],
			 description: 'Click log'
		 },
		 hover_log: {
			 type: jsPsych.plugins.parameterType.OBJECT,
			 pretty_name:'click_log',
			 default: {"i":[],
			 "j":[],
			 'x':[],
			 'y':[],
			 "t":[]},
			 description: 'Click log'
		 },
		 already_clicked: {
 				type: jsPsych.plugins.parameterType.INT,
 				pretty_name: "Already clicked cells",
 				default: [[1,0]],
 				description: "For half games. List of tuples of i,j that have been clicked. [] for fresh start."
		 },
		 boost: {
			type: jsPsych.plugins.parameterType.BOOL,
			pretty_name:'boost',
			default: false,
			description: 'When true, participants see a boost button next to board.'
		},
	 }
	}

	plugin.trial = function(display_element, trial) {

		display_element.innerHTML = '';

		//open a p5 sketch
		let sketch = function(p) {

			const du = p.min([window.innerWidth, window.innerHeight, 500])*7/10 //drawing unit
			const left_margin = p.round((window.innerWidth-du)/2); // white space left to the grid
			const right_edge = left_margin+du;
			const top_margin = p.round((window.innerHeight-du)/3);
			const square_size = Math.floor(du/trial.grid.length);
			const colors = {
				'white':p.color(255),
				'unknown':p.color(255,230,166),
				'black':p.color(0,0,0)
				}
			
			const boostButtonX = right_edge + du*0.1
			const boostButtonY = top_margin + du*0.5;

			const boostButtonWidth =  du * 0.45;
			const boostButtonHeight = du * 0.3;

			// if (trial.boost) { 
						
			// 	p.fill(window.boostColor);
			// 	p.stroke('violet');
			// 	p.strokeWeight(3);
			// 	p.rect(boostButtonX, boostButtonY, boostButtonX+boostButtonWidth, boostButtonY+boostButtonHeight);
			// 	p.strokeWeight(1);
			// 	p.fill(0); //black
			// 	p.textAlign(p.CENTER, p.CENTER);
			// 	p.textSize(18);
			// 	p.text(window.boost_button_label, boostButtonX +(boostButtonWidth/2), boostButtonY +(boostButtonHeight/2) );		
	
			// }
			// p.pop();
			// p.push();

			// console.log(trial.grid)
			// console.log(trial.already_clicked)

			var grid_state = trial.grid.map(([...rest]) => rest.map(x => 'unknown')); // make all yellow

			const num_nonzero = trial.grid.flat().reduce((a,b)=>a+(b=='0'? 0 : 1),0);
			var hits = 0;;
			var last_click_time = p.millis()
			var click_number = 0;
			var frame_number = 0;
			var click_log = {i:[],j:[],t:[],hit:[]};
			trial.click_log.t.push(Infinity);

			for (var i_click=0; i_click<trial.already_clicked.length; i_click++) {
				i = trial.already_clicked[i_click][0];
				j = trial.already_clicked[i_click][1];
				console.log(trial.grid[i][j]) // should be all black
				// value = trial.grid[i][j]=='0'? 'white' : 'black'
				grid_state[i][j]='black';hits++
	
			}

			const origin = grid_coordinates_to_screen_coordinates(0,0)
			const endpoint = grid_coordinates_to_screen_coordinates(trial.grid.length-1, trial.grid.length-1);


			function grid_coordinates_to_screen_coordinates(i,j) {
				x=left_margin+j*square_size+Math.round(square_size/2);
				y=top_margin+i*square_size+Math.round(square_size/2);
				return({x:x,y:y})
			}

			function screen_coordinates_to_grid_coordinates(x,y) {
				i = Math.floor((y-top_margin)/square_size);
				j = Math.floor((x-left_margin)/square_size);
				return({i:i,j:j})
			}

			
			function universal_coordinates_to_screen_coordinates(x,y) {
				new_x = x*(endpoint.x-origin.x)+origin.x;
				new_y = y*(endpoint.y-origin.y)+origin.y;
				return({x:new_x,y:new_y})
			}


			function msToTime(duration) {
			var milliseconds = Math.floor((duration % 1000) / 10),
				seconds = Math.floor((duration / 1000) % 60),
				minutes = Math.floor((duration / (1000 * 60)) % 60),
				hours = Math.floor((duration / (1000 * 60 * 60)) % 24);

			hours = (hours < 10) ? "0" + hours : hours;
			minutes = (minutes < 10) ? "0" + minutes : minutes;
			seconds = (seconds < 10) ? "0" + seconds : seconds;
				milliseconds = (milliseconds<10)? "0"+milliseconds:milliseconds;
			return hours + ":" + minutes + ":" + seconds + ":" + milliseconds;
			}

		//sketch setup
		p.setup = function() {
			p.createCanvas(p.windowWidth, p.windowHeight);
			p.strokeWeight(0);
			p.frameRate(trial.frame_rate);
			p.rectMode(p.CENTER)
			window.total_points=30;
			console.log(window.data[window.i_subj][window.i_game].gamePoints)
			window.gamePoints = window.data[window.i_subj][window.i_game].currentGamePoints;
			if (window.i_game==1) {window.gamePoints = window.InitialGamePoints}
			window.whitesClicked =0
		}

		//organize everything in one sequence
		p.draw = function() {

			p.background(255);

			if (hits<num_nonzero | p.millis()-last_click_time<trial.end_screen_time) {

				// emulate clicks
				if (p.millis()>=trial.click_log.t[click_number]) {
					ij = {i:trial.click_log.i[click_number],j:trial.click_log.j[click_number]};
					if (trial.grid[ij.i][ij.j]=='0') {
						grid_state[ij.i][ij.j]='white'
						window.whitesClicked += 1;
						window.boardPoints = window.boardPoints-window.lossWhites;
						window.gamePoints = window.gamePoints-window.lossWhites;
						window.pointsColor = '#FF7F7F';
						// if (window.boost){window.pointsColor = '#FF0000'; // darker red
						// }
						setTimeout(function() { window.pointsColor = ' #FFE6A6';}, 500);
					} else {
						grid_state[ij.i][ij.j]='black';
						hits+= 1;
						// if (window.boost){							
						// 	window.boardPoints = window.boardPoints+window.gainBlacks
						// 	window.gamePoints = window.gamePoints+window.gainBlacks;

						// 	window.pointsColor = '#39FF14';
						// 	setTimeout(function() { window.pointsColor = ' #FFE6A6';}, 500);
						// }
					}
					last_click_time = p.millis();
					click_log.i.push(ij.i); // push previousy defined in here again
					click_log.j.push(ij.j);
					click_log.t.push(p.millis())
					click_log.hit.push((trial.grid[ij.i][ij.j]))
					// click_log.b.push(Number(window.boost))
					click_number = click_number+1
					}


				// Description
				p.push()
				p.textFont("monospace", 15)
				text =  window.data[window.i_subj][window.i_game].PROLIFIC_PID.substring(0, 6) + ' board ID '+ trial.board_number + ' | RT ' + msToTime(p.millis());
				p.textAlign(p.Left, p.TOP)
				p.fill(100);
				p.strokeWeight(0)
				p.text(text,left_margin,top_margin+du+20)
				p.pop()
				for (var i=0; i<trial.grid.length; i++) {
					for (var j=0; j<trial.grid.length; j++) {
						xy = grid_coordinates_to_screen_coordinates(i,j);
						p.fill(colors[grid_state[i][j]]);
						p.stroke(127,182,177);
						p.strokeWeight(1)
						p.square(xy.x,xy.y,square_size);
					}
				}

				if (trial.cheat) {
					//mark ships with a cross
					for (var i=0; i<trial.grid.length; i++) {
						for (var j=0; j<trial.grid.length; j++) {
							if (trial.grid[i][j]!='0') {
								xy = grid_coordinates_to_screen_coordinates(i,j);
								p.line(xy.x-square_size/2,xy.y-square_size/2,
									xy.x+square_size/2,xy.y+square_size/2);
								p.line(xy.x+square_size/2,xy.y-square_size/2,
										xy.x-square_size/2,xy.y+square_size/2)
							}
						}
					}
				}
				p.push()
				p.rectMode(p.CORNERS)
				p.fill(window.pointsColor);

				p.noStroke();
				let ptButtonY = boostButtonY-boostButtonHeight-boostButtonHeight*0.2;
				let ptButtonHeight = boostButtonHeight*0.4;
				
				p.rect(boostButtonX, ptButtonY, boostButtonX+boostButtonWidth,ptButtonY+ptButtonHeight);
				p.textSize(15)
				p.textAlign(p.CENTER, p.CENTER)
				p.fill(0);
				p.strokeWeight(0)
				p.text(`Points:`,boostButtonX, ptButtonY-20, du/2);	
				p.textSize(25);
				p.text(`${window.gamePoints}`,boostButtonX, ptButtonY+ptButtonHeight/2, du/2);
				p.noStroke();
				p.textSize(15);

				p.pop();
				p.push()

				if (hits<num_nonzero) {

					p.rectMode(p.CORNERS)
					p.textSize(15)
					p.textAlign(p.CENTER, p.CENTER)
					p.fill(0);
					p.strokeWeight(0)
					p.text(trial.text,left_margin,top_margin-30,du);

					// if (trial.cheat) {
					// 	// Description
					// 	text=`Remember, your real task is to play like a person who tries to win but does not know where the black squares are.`;
					// 	p.text(text,left_margin,top_margin+du+20,du);

					// 	if (p.millis()<trial.draw_attention_to_instructions_time) {
					// 		p.push()
					// 		p.textSize(50);
					// 		var red_value = 128+p.sin(p.millis()/200)*127
					// 		p.fill([255,255-red_value,255-red_value]);
					// 		p.text('!',left_margin-20,top_margin+du+40,20)
					// 		p.pop()
					// 	}
					// }
					p.pop();


			} else {


				for (var i=0; i<trial.grid.length; i++) {
					for (var j=0; j<trial.grid.length; j++) {
						if (trial.grid[i][j]=='0') {
							xy = grid_coordinates_to_screen_coordinates(i,j);
							opacity = 	p.min(1,(p.millis()-last_click_time)/(trial.end_screen_time/2));
								p.push()
								p.fill([(1-opacity)*colors[grid_state[i][j]].levels[0]+(opacity)*colors['white'].levels[0],
									(1-opacity)*colors[grid_state[i][j]].levels[1]+(opacity)*colors['white'].levels[1],
									(1-opacity)*colors[grid_state[i][j]].levels[2]+(opacity)*colors['white'].levels[2]]);
								p.stroke(127,182,177,(1-opacity)*255);
								p.square(xy.x,xy.y,square_size);
								p.pop()
						}
					}
				}
			}

			while (trial.hover_log.t[frame_number+1]<p.millis()) {
				frame_number++
			}
			p.push()
			p.fill(p.color('#d71319'))

			// if (trial.hover_log.t[frame_number]<0) {
			// 	// if (!window.boost){
			// 	// 	let currentPoints = window.boardPoints;
			// 	// 	window.whitesClicked = 0; window.gainBlacks = 1; window.lossWhites = 3; // restart counter
			// 	// 	window.boardPoints = currentPoints; // do not retrospectively subtract points
			// 	// 	window.boost = true;
			// 	// 	window.boost_button_label = "BOOST is ON";
			// 	// 	window.boostColor = 'violet';
			// 	// }
			// }
			
			xy = universal_coordinates_to_screen_coordinates(trial.hover_log.x[frame_number],trial.hover_log.y[frame_number])
			p.circle(xy.x,xy.y,15)

			}



		else { //trial ended
					p.remove()
					// data saving
					var trial_data = {
						grid: trial.grid,
				    click_log: click_log
					}; 
					// console.log(trial_data)
					// end trial
					jsPsych.finishTrial(trial_data);
				}
			}

		};

		// start sketch!
		let myp5 = new p5(sketch);

}

//Return the plugin object which contains the trial
return plugin;
})();
