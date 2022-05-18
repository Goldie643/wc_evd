import * as THREE from "three"
import CSG from "./three-csg.js"
import { pmt_info } from "./pmt_prod_year.js"
import { OrbitControls } from "./OrbitControls.js"

const SKR = 1690; // Radius of SK
const SKHH = 1810; // Half height of SK
// Longest distance in tank
const MAX_R = Math.sqrt((2*1690)*(2*1690) + (2*1810)*(2*180)) 

const event = await fetch("event.json").then(response => response.json());

// Redefine z to be upwards as in SK's convention
THREE.Object3D.DefaultUp = new THREE.Vector3(0, 0, 1);

// Use and convert detector geo into an actual mesh.
function PlotDetector( scene ) {
    const geometry = new THREE.CylinderGeometry( SKR, SKR, 2*SKHH, 64);
    const material = new THREE.MeshBasicMaterial( {color: 0x808080,
        transparent: true, opacity: 0.5} );
    const mesh = new THREE.Mesh( geometry, material );
    scene.add( mesh )

    return;
}

// Plot yellow spheres for a list of Vector3s
function PlotHits( scene, hits ) {
    const hit_geom = new THREE.SphereGeometry( 25, 32, 16 );
    const material = new THREE.MeshBasicMaterial( {color: 0xFFFF00} );
    for (let hit of hits) {
        const mesh = new THREE.Mesh( hit_geom, material )
        mesh.position.copy( hit );
        scene.add( mesh );
    }

    return
}

// Plots a little red (x) green (y) blue (z) axis indicator 
function PlotXYZ( scene ) {
    // Now add an arrow for direction
    const x = new THREE.Vector3( 1, 0, 0 );
    const y = new THREE.Vector3( 0, 1, 0 );
    const z = new THREE.Vector3( 0, 0, 1 );
    // const origin = new THREE.Vector3( SKR+200, SKR+200, -SKHH );
    const origin = new THREE.Vector3( 0, 0, 0 );
    const l = 500;
    const x_hex = 0xFF0000;
    const y_hex = 0x00FF00;
    const z_hex = 0x0000FF;
    // TODO: loop this
    const x_arr = new THREE.ArrowHelper( x, origin, l, x_hex );
    const y_arr = new THREE.ArrowHelper( y, origin, l, y_hex );
    const z_arr = new THREE.ArrowHelper( z, origin, l, z_hex );
    scene.add( x_arr );
    scene.add( y_arr );
    scene.add( z_arr );
}

const rainbowGrad = [
    { pct: 0.0, color: { r: 0xff, g: 0x00, b: 0 } },
    { pct: 0.5, color: { r: 0xff, g: 0xff, b: 0 } },
    { pct: 1.0, color: { r: 0x00, g: 0xff, b: 0 } } ];
const blueGrad = [
    { pct: 0.0, color: { r: 0xff, g: 0xff, b: 0xff } },
    { pct: 1.0, color: { r: 0x00, g: 0x60, b: 0xff } } ];
const redGrad = [
    { pct: 0.0, color: { r: 0xff, g: 0xff, b: 0xff } },
    { pct: 1.0, color: { r: 0xff, g: 0x16, b: 0x00 } } ];

function PickColour(pct, percentColors=blueGrad) {
    for (var i = 1; i < percentColors.length - 1; i++) {
        if (pct < percentColors[i].pct) {
            break;
        }
    }
    var lower = percentColors[i - 1];
    var upper = percentColors[i];
    var range = upper.pct - lower.pct;
    var rangePct = (pct - lower.pct) / range;
    var pctLower = 1 - rangePct;
    var pctUpper = rangePct;
    var color = {
        r: Math.floor(lower.color.r * pctLower + upper.color.r * pctUpper),
        g: Math.floor(lower.color.g * pctLower + upper.color.g * pctUpper),
        b: Math.floor(lower.color.b * pctLower + upper.color.b * pctUpper)
    };
    return 'rgb(' + [color.r, color.g, color.b].join(',') + ')';
    // or output as hex if preferred
};

// Plot all PMTs from pmt_info
function PlotPMTs( scene, pmt_info, event ) {
    const pmt_geom = new THREE.SphereGeometry( 25, 32, 16 );
    const nohit_mat = new THREE.MeshBasicMaterial( {color: 0x808080,
        transparent: true, opacity: 0.1} );
    for (let pmt of pmt_info) {
        let mat = nohit_mat;
        if (event.cable.includes( pmt.cable )) {
            // Don't plot hit PMTs
            continue;
        };
        const mesh = new THREE.Mesh( pmt_geom, mat );
        mesh.position.set( pmt.x, pmt.y, pmt.z );
        scene.add( mesh );
    }

    // const hit_mat = new THREE.MeshBasicMaterial( {color: 0xFFFF00} );
    const t_max = Math.max(...event.t);
    const t_min = Math.min(...event.t);
    // Loop through all hits
    for (let i = 0; i < event.cable.length; i++) {
        let cable = event.cable[i];
        let t = event.t[i];
        let t_scaled = (t-t_min)/(t_max-t_min)
        // PMT cables are 1-indexed
        let pmt = pmt_info[cable-1];
        let hit_mat = new THREE.MeshBasicMaterial( 
            {color: PickColour(t_scaled)} );
        let mat = hit_mat;
        const mesh = new THREE.Mesh( pmt_geom, mat );
        mesh.position.set( pmt.x, pmt.y, pmt.z );
        scene.add( mesh );
    }
    
    return
}


function PlotPMTs2D( scene, pmt_info, event ) {
    const pmt_geom = new THREE.SphereGeometry( 25, 32, 16 );
    const nohit_mat = new THREE.MeshBasicMaterial( {color: 0x808080,
        transparent: true, opacity: 0.1} );
    const hit_mat = new THREE.MeshBasicMaterial( {color: 0xFFFF00} );

    const top_pmts = pmt_info.filter(pmt => pmt.z > SKHH-1);
    const bot_pmts = pmt_info.filter(pmt => pmt.z < -SKHH+1);
    const wall_pmts = pmt_info.filter(pmt => pmt.z > -SKHH+1 && pmt.z < SKHH-1);

    function AddPMTsToScene( pmt_sub_info, offset=0, wall=false ){
        for (let pmt of pmt_sub_info) {
            let mat = nohit_mat;
            if (event.cable.includes( pmt.cable )) {
                mat = hit_mat;
                // Don't plot hit PMTs
                // continue;
            };
            const mesh = new THREE.Mesh( pmt_geom, mat );
            if (wall){
                // let theta = Math.atan( pmt.y/pmt.x );
                // Avoid tan cause of near-infinites.
                let theta = Math.acos( pmt.x / SKR );
                if (pmt.y <= 0) {
                    theta = theta - Math.PI;
                } else {
                    theta = -theta + Math.PI;
                }
                theta = theta - Math.PI/16;
                mesh.position.set( theta*SKR, pmt.z, 0 );
            }
            else{
                mesh.position.set( pmt.x, pmt.y + offset, 0 );
            }
            scene.add( mesh );
        }
    }

    AddPMTsToScene( top_pmts, 2*SKHH );
    AddPMTsToScene( bot_pmts, -2*SKHH );
    AddPMTsToScene( wall_pmts, 0, true );

    return

    function addSinglePMT( x, y, c ){
        const mat = new THREE.MeshBasicMaterial( {color: c} );
        let theta = Math.acos( x / 1 );
        // Minus so it's as IRL, not just by theta convention
        if ( y <= 0 ) {
            theta = theta - Math.PI;
        } else {
            theta = -theta + Math.PI;
        }
        theta = theta + Math.PI/8;
        const mesh = new THREE.Mesh( pmt_geom, mat );
        mesh.position.set( theta*SKR, 0, 0 );
        scene.add( mesh );

    }
    const a = Math.sqrt(1/2)
    addSinglePMT( 1, 0, "white");
    addSinglePMT( a, -a, "pink");
    addSinglePMT( 0, -1, "red");
    addSinglePMT( -a, -a, "black");
    addSinglePMT( -1, 0, "green");
    addSinglePMT( -a, a, "teal");
    addSinglePMT( 0, 1, "blue");
    addSinglePMT( a, a, "light blue");

    return
}

function PlotVTX( scene, vtx ) {
    const geom = new THREE.SphereGeometry( 25, 32, 16 );
    const mat = new THREE.MeshBasicMaterial( {color: 0xFF0000} );
    const mesh = new THREE.Mesh( geom, mat );

    const origin = new THREE.Vector3( vtx.bx, vtx.by, vtx.bz );

    scene.add( mesh );
    mesh.position.copy( origin );

    // Now add an arrow for direction
    const dir = new THREE.Vector3( vtx.x_dir, vtx.y_dir, vtx.z_dir );
    dir.normalize();
    const length = 1000;
    const hex = 0xFF0000;
    const arrowHelper = new THREE.ArrowHelper( dir, origin, length, hex );
    scene.add( arrowHelper );

    // Now 42deg Cherenkov cone
    const cone_l = MAX_R;
    const cone_r = cone_l*Math.tan( 42/2 );
    const cone_geom = new THREE.ConeGeometry( cone_r, cone_l, 32 );

    const cone_mat = new THREE.MeshBasicMaterial( {color: 0xd91ff, 
        transparent: true, opacity: 0.2, side: THREE.DoubleSide} );
    const cone = new THREE.Mesh( cone_geom, cone_mat );

    // Move cone to origin, point along direction vector
    cone.position.copy( origin );
    const dir_offset = new THREE.Vector3(
        vtx.bx + (vtx.x_dir*cone_l/2),
        vtx.by + (vtx.y_dir*cone_l/2),
        vtx.bz + (vtx.z_dir*cone_l/2)
    )
    cone.lookAt( dir_offset )
    cone.rotateX( - Math.PI / 2 )

    // Move alond direction by cone length/2 to put tip of cone on vtx
    cone.position.copy( 
        dir_offset
    );

    // Clip from cylinder
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry( 
        SKR, SKR, 2*SKHH, 64));
    cyl.rotateX( Math.PI / 2 )

    cyl.updateMatrix()
    cone.updateMatrix()

    const bsp_cyl = CSG.fromMesh( cyl );
    const bsp_cone = CSG.fromMesh( cone );

    const bsp_result = bsp_cone.intersect(bsp_cyl)
    const cone_clip = CSG.toMesh( bsp_result, cone.matrix, cone.material )

    scene.add( cone_clip )
    // scene.add( cone )
    
    return
}

// Setup container to render into
const container = document.getElementById( "evd_renderer" )
const xyz_container = document.getElementById( "xyz_renderer" )
// document.body.appendChild( container );

// Setup renderer
const renderer = new THREE.WebGLRenderer( {alpha: true} );
renderer.setSize( container.clientWidth, container.clientHeight );
container.appendChild( renderer.domElement );

const xyz_renderer = new THREE.WebGLRenderer( {alpha: true} );
xyz_renderer.setSize( xyz_container.clientWidth, xyz_container.clientHeight );
xyz_container.appendChild( xyz_renderer.domElement );

// Setup a scene
const scene = new THREE.Scene();
const xyz_scene =  new THREE.Scene();

// Add all the meshes to the scene
// PlotDetector( scene );
// PlotHits( scene, hits );

PlotPMTs2D( scene, pmt_info, event );
// PlotPMTs( scene, pmt_info, event );
// PlotVTX( scene, event )
// PlotXYZ( xyz_scene )

// Setup a default camera (other control types like Ortho are available).
const d = 500;
const aspect = window.innerWidth / window.innerHeight;
// const camera = new THREE.PerspectiveCamera( 45, aspect, 1, 100000 );
// const camera = new THREE.OrthographicCamera( -d*aspect, d*aspect, d,
//     -d, 1, 100000 );
const camera = new THREE.OrthographicCamera( -window.innerWidth, window.innerWidth, window.innerHeight,
    -window.innerHeight, 1, 100000 );
camera.zoom = 0.2
camera.updateProjectionMatrix();
// const xyz_aspect = xyz_container.width / xyz_container.height
const xyz_aspect = 1;
// const xyz_camera = new THREE.OrthographicCamera( - window.innerWidth /
//     window.innerHeight, 1, 100000 );
const xyz_camera = new THREE.OrthographicCamera( -d*xyz_aspect, d*xyz_aspect, d,
    -d, 1, 100000 );

// Control camera with orbit controls
const controls = new OrbitControls( camera, renderer.domElement );
// Separate control
const xyz_controls = new OrbitControls( xyz_camera, renderer.domElement );
xyz_controls.enableZoom = false
xyz_controls.enablePan = false

// camera.position.set( 0, 8000, 3000 );
camera.position.set( 0, 0, 30000 );
camera.lookAt( 0, 0, 0 );
// xyz_camera.position.set( 0, 80000, 30000 );
xyz_camera.position.set( 0, 0, 30000 );
xyz_camera.lookAt( 0, 0, 0 );

controls.saveState()
xyz_controls.saveState()

// controls.saveState();
controls.update()

// renderer.render( scene, camera );
function animate() {
    controls.update()
    xyz_controls.update()
	requestAnimationFrame( animate );
	renderer.render( scene, camera );
	xyz_renderer.render( xyz_scene, xyz_camera );
};
animate();

const reset_btn = document.getElementById("reset_button"); 
reset_btn.addEventListener("click", resetView)

function resetView() { 
    controls.reset()
    xyz_controls.reset()
    return
}

function onWindowResize() {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( container.clientWidth, container.clientHeight );

    xyz_camera.aspect = xyz_container.clientWidth / xyz_container.clientHeight;
    xyz_camera.updateProjectionMatrix();
    xyz_renderer.setSize( xyz_container.clientWidth, xyz_container.clientHeight );
}

window.onresize = () => onWindowResize();

// Now print out event information
const run_info_str = `Run: ${event.nrunsk} 
    Subrun: ${event.nsubsk} 
    Date: ${event.year}-${event.month}-${event.day}

    Trigid: ${event.trigid}
    BONSAI Energy: ${event.bsenergy.toFixed(3)} MeV
    `;
const run_info = document.getElementById("run_info_text");
const run_text = document.createTextNode(run_info_str);

run_info.appendChild(run_text);

// Print event number into input field, get it to get a specific event
const event_no = document.getElementById("event_no");
const event_no_err = document.getElementById("event_no_err")
event_no.value = event.nevsk;
event_no.addEventListener("keyup", function (e) {
    if (e.key === "Enter") {
        const event_query = `?event=${event_no.value}`
        fetch(event_query).then(response => {
            console.log(response)
            if (response.ok) {
                event_no_err.innerHTML = ""
                window.location.replace('/')
            }
            else {
                event_no_err.innerHTML = "Event not found!"
            }
        })
    }
});

// Plot Q and T histograms
const thist = {
    x: event.t,
    type: "histogram",
};
const thist_layout = {
    width: "500",
    height: "400",
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: {
        family: "Trebuchet MS",
        color: "aliceblue"
    },
    xaxis: {
        title: "t [ns]"
    }
}
const tdata = [thist];
Plotly.newPlot("thist_div", tdata, thist_layout);

const qhist = {
    x: event.q,
    type: "histogram",
};
const qhist_layout = {
    width: "500",
    height: "400",
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: {
        family: "Trebuchet MS",
        color: "aliceblue"
    },
    xaxis: {
        title: "q [pe]"
    }
}
const qdata = [qhist];
Plotly.newPlot("qhist_div", qdata, qhist_layout);