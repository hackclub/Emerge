<script>
	


	import { onMount } from 'svelte';

	let boids = [];
	const numBoids = 200;
	const mouse = { x: 0, y: 0 };

	function handleMouseMove(event) {
		mouse.x = event.clientX;
		mouse.y = event.clientY;
	}
	
	onMount(() => {
		/*
		window.addEventListener("scroll", () => {
		const scrollTop = window.scrollY;
		const docHeight = document.body.scrollHeight - window.innerHeight;
		const scrollPercent = scrollTop / docHeight;
		//scroll to grow
		if (scrollPercent < 0.25) {
			emoji.textContent = "🏜️"; 
		} else if (scrollPercent < 0.5) {
			emoji.textContent = "🌱"; 
		} else if (scrollPercent < 0.75) {
			emoji.textContent = "🌧️"; 
		} else {
			emoji.textContent = "🌳"; 
		}

		// increment size with scroll
		emoji.style.fontSize = `${28 + scrollPercent * 20}px`;
		});
		const emoji = document.getElementById("emoji");
		*/
		// init all the boids
		boids = Array.from({ length: numBoids }, () => ({
			x: Math.random() * window.innerWidth,
			y: Math.random() * window.innerHeight,
			vx: (Math.random() - 0.5) * 2,
			vy: (Math.random() - 0.5) * 2
		}));

		// update loop
		function updateBoids() {
			const perceptionRadius = 100;
			const mouseAttraction = 0.05;

			for (let i = 0; i < boids.length; i++) {
				let boid = boids[i];

				let alignment = { x: 0, y: 0 };
				let cohesion = { x: 0, y: 0 };
				let separation = { x: 0, y: 0 };
				let total = 0;

				for (let j = 0; j < boids.length; j++) {
					if (i === j) continue;

					let other = boids[j];
					let dx = other.x - boid.x;
					let dy = other.y - boid.y;
					let distance = Math.hypot(dx, dy);

					if (distance < perceptionRadius) {
						alignment.x += other.vx;
						alignment.y += other.vy;

						cohesion.x += other.x;
						cohesion.y += other.y;

						if (distance < 30) {
							separation.x -= dx;
							separation.y -= dy;
						}
						total++;
					}
				}

				if (total > 0) {
					alignment.x /= total;
					alignment.y /= total;

					cohesion.x = cohesion.x / total - boid.x;
					cohesion.y = cohesion.y / total - boid.y;

					boid.vx += alignment.x * 0.05 + cohesion.x * 0.005 + separation.x * 0.05;
					boid.vy += alignment.y * 0.05 + cohesion.y * 0.005 + separation.y * 0.05;
				}

				//pull toward mouse
				//let dx = mouse.x - boid.x;
				//let dy = mouse.y - boid.y;
				//boid.vx += dx * mouseAttraction / 10;
				//boid.vy += dy * mouseAttraction / 10;

				//speed lim
				let speed = Math.hypot(boid.vx, boid.vy);
				let maxSpeed = 2.6;
				if (speed > maxSpeed) {
					boid.vx = (boid.vx / speed) * maxSpeed;
					boid.vy = (boid.vy / speed) * maxSpeed;
				}

				
				boid.x += boid.vx;
				boid.y += boid.vy;
				const boidWidth = 60; 
				const boidHeight = 20;

				if (boid.x < -boidWidth) boid.x = window.innerWidth + boidWidth;
				if (boid.x > window.innerWidth + boidWidth) boid.x = -boidWidth;
				if (boid.y < -boidHeight) boid.y = window.innerHeight + boidHeight;
				if (boid.y > window.innerHeight + boidHeight) boid.y = -boidHeight;

			}

			//makes it reactive with svelte
			boids = [...boids];

			requestAnimationFrame(updateBoids);
		}

		requestAnimationFrame(updateBoids);
	});
</script>

<style>

a {
  color: blue;
  text-decoration: underline;
}

a:hover, a:active {
  background-color: white;
}

.floating-emoji {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background-color: red;
  color: white;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  transition: font-size 0.3s ease;/* fade in */
  z-index: 1000;
}

.submit-button {
  background-color: #ec3750; /* HC red <3 */
  color: white;
  padding: 12px 24px;
  text-decoration: none;
  border-radius: 12px;
  font-weight: bold;
  font-family: 'Phantom Sans', sans-serif;
  font-size: 1rem;
  display: inline-block;
  transition: background-color 0.2s ease;
}

.submit-button:hover {
  background-color: #c8243a; 
}


html, body {
	margin: 0;
	padding: 0;
	overflow-x: hidden; /* stops the jittery width with edge collisions */
	width: 100%;
}

table, th, td {
	border:1px solid black;	
	margin: 0 auto;
	text-align: left;
	padding: 0.5%;
	background-color: #cde3e7ff;
}

#h1 {
	font-size: 50px;
	width: 100%;
}
#fadeBW {
	height: 200px;
	background-color: white;
	background-image: linear-gradient(black, #e4ddeb);
	width: 100%;
	margin: 0;
	padding: 0;
}
#description {
	background-color: #e4ddeb;
	width: 100%;
	padding: 2rem;
	box-sizing: border-box;
}

	.dot {
		position: absolute;
		width: 16px;
		height: 16px;
		background-color: #f472b6;
		border-radius: 50%;
		opacity: 0.2;
		pointer-events: none;
		transition: transform 0.05s linear;
	}
.boid {
	position: absolute;
	width: 0;
	height: 0;
	border-left: 6px solid transparent;
	border-right: 6px solid transparent;
	border-bottom: 10px solid #5b8ddaff; 
	opacity: 1;
	pointer-events: none;
	transition: transform 0.1s linear, opacity 0.1s;
}
@import url('https://fonts.googleapis.com/css2?family=Phantom+Sans:wght@400;700&display=swap');

.title {
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	font-family: 'Phantom Sans', sans-serif;
	font-size: 5rem;
	color: white;
	opacity: 0;
	animation: fadeIn 8s ease-out forwards;
	pointer-events: none;
	user-select: none;
	white-space: nowrap;
}
.sub {
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	font-family: 'Phantom Sans', sans-serif;
	font-size: 1.8rem;
	color: white;
	opacity: 0;
	animation: fadeIn 10s ease-out forwards;
	pointer-events: none;
	user-select: none;
	white-space: nowrap;
}
@keyframes fadeIn {
	from {
		opacity: 0;
	}
	to {
		opacity: 0.8;
	}
}
.footer{
	background-color: #c8243aff;
	height:8vh;
	text-align:center;
	font-size: 20px;


}
</style>



<div class="h-screen w-full bg-black relative overflow-hidden" on:mousemove={handleMouseMove}>


	<!-- Boids -->
	{#each boids as boid (boid)}
		{#if boid.x > 6 && boid.x < window.innerWidth - 6 && boid.y > 10 && boid.y < window.innerHeight - 10}
			<div
				class="boid"
				style="
					transform: translate({boid.x}px, {boid.y}px) rotate({Math.atan2(boid.vy, boid.vx)}rad);
				"
			/>
		{/if}
	{/each}
	<h1 class="title">EMERGE<p class = sub><br><br>scroll for details</p></h1>
	
</div>
<div id="fadeBW"></div>
<div id="description">
<br><br><br><div id="h1"><h1><u><b>Emerge YSWS:</b></u></h1></div>
<p>The universe is big, beautiful, and <i>probably</i> not simulated, but if anything makes me doubt that, its <b>emergent behaviours.</b><br>Emergent behaviours are systems defined by simple rules that produce intricate and often beautifully complex results. A lot of natures incredible feats can be modelled by just a few easily programmible rules!</p>
<br>
<p>The example on this pages title screen is called boids (bird-oid objects), it mimicks the behaviour of flocking birds using only 3 simple rules.
	<br>
	<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Seperation: Boids steer away from other Boids that get too close
	<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Alignment: Boids try to match the speed and direction of their neighbours
	<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Cohesion: Boids move toward the center of mass of their neighbours
	<br><br> from the formation of spots on animals to the language abilities of chatGPT, hundreds of systems excibit emergent behaviours. I've compiled a list of the best on the <a href=https://hackclub.slack.com/archives/C09900Q6873>slack channel</a>. I'd love to see what you can code, and if you write your own implementation of an emergent behaviour, all code that you write will directly help a new forest to #EMERGE. For every tracked 25 minutes you code, the Arbor Day Foundation will plant a tree!
	 The <a href="https://www.arborday.org/">Arbor Day Foundation</a>, are a fantastic non profit organisation who are going to transform your coding hours into saplings in soil, 
	  for taking part you will also recieve a (digital) Tree planted certificate and an exclusive "hacking for the planet" status to show off on your slack profile. I&#39;ll also compile a gallery to show all the submissions!<br><br><i style="font-size:0.7rem;">no stickers?? is this even hack club? -shipping out stickers to every participant kinda defeats the point of tree planting T_T, but if you really want the stickers or have a parcel coming anyway, send Euan Ripper a DM on slack and I'll sort you out!</i>  
	</p>

</div>
<div style="background-color: #cbe3f7; padding: 20px;">
  <div style="max-width: 70%; margin: 0 auto;">
    <h1 style="font-size: 2em;"><b>FAQ:</b></h1>
		<table>
		<thead>
			<tr>
				<th>Question</th>
				<th>Answer</th>
			</tr>
		</thead>
			<tbody>
				<tr>
					<td>Where is this available?</td>
					<td>Worldwide! 🌎</td>
				</tr>
				<tr>
					<td>Do I need to download anything?</td>
					<td>You will need to track your hours with Hackatime and install an extension, see <a href="https://hc-cdn.hel1.your-objectstorage.com/s/v3/b7fb99fe4502da8c1892e4c184af153c1e2f48f5_image.png">setup.</a></td>
				</tr>
				<tr>
					<td>Do I need experience?</td>
					<td>No! This is a great way to learn as someone new to coding, JavaScript, or emergent behaviours.</td>
				</tr>
				<tr>
					<td>How are we planting trees?</td>
					<td>We’re partnering with <a href="https://www.arborday.org/">The Arbor Day Foundation</a> to put saplings in the ground.</td>
				</tr>
				<tr>
					<td>Where are the trees going?</td>
					<td>The Arbor Day Foundation plants trees in schools, neighbourhoods and along streets in the US to improve urban environments as well as regenerating natural forests accross the world, with a particular focus on the Amazon River Basin.</td>
				</tr>
				<tr>
					<td>Is there a minimum hour requirement?</td>
					<td>A super basic project should take around 20 minutes :)</td>
				</tr>
				<tr>
					<td>Is there a maximum hour requirement?</td>
					<td>Absolutely not.</td>
				</tr>
				<tr>
					<td>For how long will this run?</td>
					<td>Until Monday the 8th of September!</td>
				</tr>
				<tr>
					<td>How is this financed?</td>
					<td>Through generous sponsors who want to see a better world with more coders — see <a href="https://hackclub.com/fiscal-sponsorship/">HCB</a>.</td>
				</tr>
				<tr>
					<td>Who can take part?</td>
					<td>Anyone under 18!</td>
				</tr>
			</tbody>
	</table>
	<br>running this as a club activity? see my <a href="https://hc-cdn.hel1.your-objectstorage.com/s/v3/b7fb99fe4502da8c1892e4c184af153c1e2f48f5_image.png">Clubs Workshop</a>
	
</div>
<br><br>
</div>
<div id="gallery" style="background-color: #b7b8ed; padding: 2rem;">

	<h1 style="font-size: 3.5em; text-align: center; margin-bottom: 2rem;"><b>Gallery:</b></h1>

	<div style="
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 2rem;
	">
<div style="flex: 1 1 300px; max-width: 300px; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.2);">
    <a href="https://editor.p5js.org/EuanRipper/sketches/EHEQRDQ9c" target="_blank" style="text-decoration: none; color: inherit;">
        <img src="https://hc-cdn.hel1.your-objectstorage.com/s/v3/dd54130f71e150264726704b6d8774f469738c4d_image.png" 
             alt="Sand Pits Demo" 
             style="width: 100%; height: 200px; object-fit: cover; display: block;">
        <div style="padding: 1rem; background-color: white;">
            <h3 style="margin: 0; font-family: 'Phantom Sans', sans-serif;">Sand Pits Demo</h3>
            <p style="margin: 0.5rem 0 0 0; font-size: 0.9rem; color: #555;">right click to fast add sand, left for slow. Try adding sand on one pixel for emergent behaviour.</p>
        </div>
    </a>
</div>

<div style="flex: 1 1 300px; max-width: 300px; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.2);">
    <a href="https://editor.p5js.org/EuanRipper/sketches/jcCEwdaPH" target="_blank" style="text-decoration: none; color: inherit;">
        <img src="https://hc-cdn.hel1.your-objectstorage.com/s/v3/a2d07d44d8bc5cc3258c8fc7a13bec20847d0d6d_image.png" 
             alt="Conway's Game of Life Thumbnail" 
             style="width: 100%; height: 200px; object-fit: cover; display: block;">
        <div style="padding: 1rem; background-color: white;">
            <h3 style="margin: 0; font-family: 'Phantom Sans', sans-serif;">Conway’s Game of Life</h3>
            <p style="margin: 0.5rem 0 0 0; font-size: 0.9rem; color: #555;">Add cells with mouse and hold space to play. From simple rules complex interactions can arise!</p>
        </div>
    </a>
</div>
	</div>
</div>
<div style="text-align: center; padding: 3rem 0; background-color: #d5f2e3;">
	<p style="font-size: 1.5rem; margin-bottom: 1rem;">Ready to submit?🌳</p>
	<a href="https://airtable.com/appkvgcDqKrSEsojv/pagiSHKTdFhFTfJYY/form" class="submit-button">Submit</a>
</div>


<div class=footer>
	<p>
	made with &lt;3 by <a href=https://hackclub.com>hack clubbers</a>
	</p>
</div>
