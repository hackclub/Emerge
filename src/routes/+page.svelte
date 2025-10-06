<script lang="ts">
import { onMount } from 'svelte';

type Cell = [number, number];
type Highlight = { x: number; y: number } | null;

interface Boid {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

let boids: Boid[] = [];
const numBoids = 200;
const mouse = { x: 0, y: 0 };

function handleMouseMove(event: MouseEvent) {
  mouse.x = event.clientX;
  mouse.y = event.clientY;
}

onMount(() => {
  // canvas responsive setup
  let cleanup: (() => void) | undefined;

  (async () => {
    const canvas = document.getElementById('gridCanvas') as HTMLCanvasElement | null;
    const container = document.getElementById('canvasContainer') as HTMLElement | null;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const c = canvas as HTMLCanvasElement;
    const CTX = ctx as CanvasRenderingContext2D;

  let rows = 50;
  let cols = 50;
  // filledCells normalized to objects { r, c, color }
  type FilledCell = { r: number; c: number; color?: string };
  let filled: FilledCell[] = [];

    try {
      const res = await fetch('/canvas.json');
      if (res.ok) {
        const data = await res.json();
        rows = data.rows || rows;
        cols = data.cols || cols;
        // normalize filled entries: support legacy [r,c] arrays and new {r,c,color} objects
        const raw = data.filled || [];
        filled = raw.map((item: any) => {
          if (Array.isArray(item) && item.length >= 2) {
            return { r: Number(item[0]), c: Number(item[1]), color: '#ec3750' };
          }
          if (item && typeof item === 'object' && 'r' in item && 'c' in item) {
            return { r: Number(item.r), c: Number(item.c), color: item.color || '#ec3750' };
          }
          return null;
        }).filter(Boolean) as FilledCell[];
      }
    } catch (e) {
      console.warn('Could not load canvas.json', e);
      filled = [];
    }

    let displaySize = 500;
    let cellWidth = displaySize / cols;
    let cellHeight = displaySize / rows;

    function setCanvasSize(sizePx: number) {
      displaySize = sizePx;
      const dpr = window.devicePixelRatio || 1;
      c.style.width = `${displaySize}px`;
      c.style.height = `${displaySize}px`;
      c.width = Math.floor(displaySize * dpr);
      c.height = Math.floor(displaySize * dpr);
      CTX.setTransform(dpr, 0, 0, dpr, 0, 0);
      cellWidth = displaySize / cols;
      cellHeight = displaySize / rows;
    }

    function drawGrid(highlight: Highlight = null) {
      CTX.clearRect(0, 0, c.width, c.height);
      CTX.strokeStyle = '#ddd';
      for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
          let x = j * cellWidth;
          let y = i * cellHeight;
          CTX.strokeRect(x, y, cellWidth, cellHeight);
        }
      }

      for (const cell of filled) {
        const r = cell.r;
        const cc = cell.c;
        const color = cell.color || '#ec3750';
        if (r >= 0 && r < rows && cc >= 0 && cc < cols) {
          CTX.fillStyle = color;
          CTX.fillRect(cc * cellWidth, r * cellHeight, cellWidth, cellHeight);
        }
      }

      if (highlight) {
        CTX.strokeStyle = 'black';
        CTX.lineWidth = 2;
        CTX.strokeRect(highlight.x, highlight.y, cellWidth, cellHeight);
        CTX.lineWidth = 1;
      }
    }

    function onPointerMove(e: MouseEvent) {
      const rect = c.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const col = Math.floor(x / cellWidth);
      const row = Math.floor(y / cellHeight);
      drawGrid({ x: col * cellWidth, y: row * cellHeight });
    }

    function onPointerLeave() {
      drawGrid();
    }

    const initialContainerWidth = container ? container.getBoundingClientRect().width : 600;
    const initialSize = Math.min(initialContainerWidth, window.innerHeight * 0.7);
    setCanvasSize(initialSize);

    c.addEventListener('mousemove', onPointerMove);
    c.addEventListener('mouseleave', onPointerLeave);

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        const size = Math.min(w, window.innerHeight * 0.7);
        setCanvasSize(size);
        drawGrid();
      }
    });
    if (container) ro.observe(container);

    const onWinResize = () => {
      const w = container ? container.getBoundingClientRect().width : window.innerWidth;
      const size = Math.min(w, window.innerHeight * 0.7);
      setCanvasSize(size);
      drawGrid();
    };
    window.addEventListener('resize', onWinResize);

    drawGrid();

    cleanup = () => {
      c.removeEventListener('mousemove', onPointerMove);
      c.removeEventListener('mouseleave', onPointerLeave);
      window.removeEventListener('resize', onWinResize);
      if (container) ro.unobserve(container);
      ro.disconnect();
    };
  })();

  return () => {
    // call async setup cleanup if set
    try {
      // nothing synchronous to clean here; async block sets up cleanup closure
    } catch (e) {
      // ignore
    }
  };
});

onMount(() => {
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

      // speed limit
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

    // makes it reactive with svelte
    boids = [...boids];

    requestAnimationFrame(updateBoids);
  }

  requestAnimationFrame(updateBoids);
});
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Phantom+Sans:wght@400;700&display=swap');

a {
  color: blue;
  text-decoration: underline;
}

a:hover, a:active {
  background-color: white;
}


.submit-button {
  background-color: #ec3750; /* HC red <3 */
  color: white;
  padding: 12px 24px;
  text-decoration: none;
  border-radius: 6px;
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
	text-align: center;
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
.canvas-title {
  text-align: center;
  font-size: 3rem;
  margin: 0.5rem 0 1rem 0;
  font-family: 'Phantom Sans', sans-serif;
}
</style>



<div class="h-screen w-full bg-black relative overflow-hidden" on:mousemove={handleMouseMove} role="region" aria-label="boids canvas container">


	<!-- Boids -->
  {#each boids as boid (boid)}
    {#if boid.x > 6 && boid.x < window.innerWidth - 6 && boid.y > 10 && boid.y < window.innerHeight - 10}
      <div
        class="boid"
        style="transform: translate({boid.x}px, {boid.y}px) rotate({Math.atan2(boid.vy, boid.vx)}rad);"
      ></div>
    {/if}
  {/each}
	<h1 class="title">EMERGE<p class = sub><br><br>scroll for details</p></h1>
	
</div>
<div id="fadeBW"></div>
<div id="description">
<br><br><br><div id="h1"><h1><u><b>Emerge YSWS:</b></u></h1></div>
<p>The universe is big, beautiful, and <i>probably</i> not simulated, but if anything makes me doubt that, its <b>emergent behaviours.</b><br>Emergent behaviours are systems defined by simple rules that produce intricate and often beautifully complex results. A lot of natures incredible feats can be modelled by just a few easily programmable rules!</p>
<br>
<p>The example on this page's title screen is called boids (bird-oid objects), it mimicks the behaviour of flocking birds using only 3 simple rules.
	<br>
	<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Seperation: Boids steer away from neighbouring Boids that get too close
	<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Alignment: Boids try to match the speed and direction of their neighbours
	<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Cohesion: Boids move toward the center of mass of their neighbours
	<br><br> from the formation of spots on animals to the language abilities of chatGPT, hundreds of systems exhibit emergent behaviours. I've compiled a list of the best on the <a href=https://hackclub.slack.com/archives/C09900Q6873>slack channel</a>. If you ship an emergent behaviour, you will get to place pixels (10 X hours tracked on hackatime) on the canvas. As more projects are submitted an <i>"artwork"</i> will #EMERGE. At the end of the event I'll ship everyone the canvas in a poster! 
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
					<td>When does this end?</td>
          <td>November 1st!</td>
				</tr>
				<tr>
					<td>Do I need to download anything?</td>
					<td>You will need to track your hours with Hackatime extension, see <a href="https://hackatime.hackclub.com/my/wakatime_setup">setup.</a></td>
				</tr>
				<tr>
					<td>Do I need experience?</td>
					<td>No! This is a great way to learn as someone new to coding, JavaScript, or emergent behaviours.</td>
				</tr>
				<tr>
					<td>Do I have to use p5.js</td>
					<td>No! but its a super great tool. What you make has to be public and easy to run!</td>
				</tr>
				<tr>
					<td>Can i get help?</td>
					<td>Yes, join the slack channel #emerge <a href="https://hackclub.slack.com/archives/C09900Q6873">here</a>.</td>
				</tr>
				<tr>
					<td>Is there a minimum hour requirement?</td>
					<td>A super basic project could be done in an hour</td>
				</tr>
        <tr>
          <td>Can I submit more than one project?</td>
          <td>Yes!</td>
        </tr>
				<tr>
					<td>someone already made the thing i wanted to do?!</td>
					<td>Make a creative twist on it! change the parameters or colours, ie adding another rule to game of life.</td>
				</tr>
				<tr>
					<td>Who can take part?</td>
					<td>Anyone under 18 or in highschool!</td>
				</tr>
			</tbody>
  </table>
</div>

</div>
<div style="background-color: #9bc0de; padding: 2rem; text-align:center;">
  <div id="canvasContainer" style="max-width: 90%; margin: 0 auto; display: inline-block;">
    <h1 class="canvas-title" style="margin-bottom: 2rem;">The Canvas</h1>
    <canvas id="gridCanvas" width="500" height="500" style="border:1px solid #ccc; display:block; margin:0 auto;"></canvas>
    <p style="font-size: 1.2rem; margin-top: 2rem; margin-bottom: 1.5rem; color: #333;">when you submit you will be granted a token to contribute to this canvas!</p>
    <a href="/edit" class="submit-button" style="margin-top: 0.5rem;">Edit</a>
  </div>
</div>
<div id="gallery" style="background-color: #b7b8ed; padding: 2rem; text-align: center;">
  <h1 style="font-size: 3.5em; margin-bottom: 2rem;"><b>Gallery:</b></h1>
  <div style="
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 2rem;
  ">
<div style="flex: 1 1 300px; max-width: 300px; border-radius: 6px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.2);">
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

<div style="flex: 1 1 300px; max-width: 300px; border-radius: 6px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.2);">
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
	<p style="font-size: 1.5rem; margin-bottom: 1rem;">Ready to submit?</p>
	<a href="https://forms.hackclub.com/emerge" class="submit-button">Submit</a>
</div>


<div class=footer>
	<p>
	made with &lt;3 by <a href=https://hackclub.com>hack clubbers</a> (Euan R)
	</p>
</div>
