import * as THREE from "./src/three.module.js"
import CSG from "./src/three-csg.js"
import { OrbitControls } from "./src/OrbitControls.js"
import { EffectComposer } from "./src/EffectComposer.js"
import { OutlinePass } from "./src/OutlinePass.js"
import { pmt_info } from "./connection.super.sk-4.js"

const SKR = 1690; // Radius of SK
const SKHH = 1810; // Half height of SK
// Longest distance in tank
const MAX_R = Math.sqrt((2*1690)*(2*1690) + (2*1810)*(2*180)) 

var event_id = 0
// Whether to load events from data like event_0.json, event_1.json etc
// Or load from a single json file.
const sep_files = false

var dataset = null
if (sep_files) {
    // TODO: Make this add all files in the folder
    const n_files = 10
    var event_data = null
    dataset = []
    for(let i=0; i<n_files; i++){
        let event_fname = `./event_data/event_${i}.json`
        event_data = await fetch(event_fname).then(response => response.json());
        dataset.push(event_data)
    }
} else {
    let event_fname = `./event_data/event_merged.json`
    dataset = await fetch(event_fname).then(
        response => response.json());
}

// Split up the data into datasets
var dataset_id = 0
// TODO: Make this dynamic (including dynamically generating buttons)
// IMPORTANT currently requires the same number of buttons in index.html
const n_datasets = 10
const n_events = dataset.length
const dataset_length = Math.ceil(n_events/n_datasets)
const datasets = []
const dataset_buttons = []
for (let i=0; i<n_datasets; i++){
    // Slice up the original full dataset to n_datasets shorter ones
    datasets.push(dataset.slice(i*dataset_length,(i+1)*dataset_length))
    // Add a button for each
    let dataset_button = document.createElement("button")
    // Set test to 1-indexed
    dataset_button.innerText = `${(i+1)}`
    // And internal parameter to actual i
    dataset_button.dataset_id = i
    // Fire changeDataset when clicked
    dataset_button.addEventListener("click", changeDataset)
    // Add to div
    document.getElementById("datasets").appendChild(dataset_button)
    dataset_buttons.push(dataset_button)
}

const selected_bg_color = "#29303A"
// Set initial dataset as clicked
dataset_buttons[dataset_id].style.backgroundColor = selected_bg_color

// Get the dataset_i of the button clicked, set the dataset to that and reload
function changeDataset(event) {
    // First reset background colour of all buttons
    for (let i=0; i<dataset_buttons.length; i++){
        dataset_buttons[i].style.backgroundColor = "transparent"
    }
    event.currentTarget.style.backgroundColor = selected_bg_color 
    // Update dataset id, load new dataset from array
    dataset_id = event.currentTarget.dataset_id
    dataset = datasets[dataset_id]
    event_id = 0
    event_data = dataset[event_id]
    resetAll()
}

dataset = datasets[dataset_id]

event_data = dataset[event_id]

const pmt_info_id = pmt_info.filter(pmt => pmt.cable <= 11146)
const pmt_info_od = pmt_info.filter(pmt => pmt.cable > 11146)

const top_pmts = pmt_info_id.filter(pmt => pmt.z > SKHH-1);
const bot_pmts = pmt_info_id.filter(pmt => pmt.z < -SKHH+1);
const wall_pmts = pmt_info_id.filter(pmt => pmt.z > -SKHH+1 && pmt.z < SKHH-1);

const top_pmts_od = pmt_info_od.filter(pmt => pmt.z > SKHH-1);
const bot_pmts_od = pmt_info_od.filter(pmt => pmt.z < -SKHH+1);
const wall_pmts_od = pmt_info_od.filter(pmt => pmt.z > -SKHH+1 && pmt.z < SKHH-1);

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
    const nohit_pmts = [];
    for (let pmt of pmt_info) {
        let mat = nohit_mat;
        if (event.cable.includes( pmt.cable )) {
            // Don't plot hit PMTs
            continue;
        };
        const mesh = new THREE.Mesh( pmt_geom, mat );
        mesh.position.set( pmt.x, pmt.y, pmt.z );
        nohit_pmts.push(mesh);
        scene.add( mesh );
    }

    // const hit_mat = new THREE.MeshBasicMaterial( {color: 0xFFFF00} );
    const nhit = event.t.length;
    // Fraction to remove from colour scale calc
    const clamp_frac = 0.1;
    const clamp_n_half = Math.round(clamp_frac*nhit/2);
    const t_sort = event.t.sort(function(a, b){return a - b});
    const t_max = t_sort[t_sort.length-clamp_n_half];
    const t_min = t_sort[clamp_n_half];
    // const t_max = Math.max(...event.t);
    // const t_min = Math.min(...event.t);
    const hit_pmts = [];
    // Loop through all hits
    for (let i = 0; i < event.cable.length; i++) {
        let cable = event.cable[i];
        let t = event.t[i];

        // Scale for colour scale calculations
        let t_scaled = (t-t_min)/(t_max-t_min)
        if ( t > t_max ) {
            t_scaled = 1;
        } else if ( t < t_min ) {
            t_scaled = 0;
        } 

        // Find index in pmt_info for cable
        const cable_i = pmt_info.findIndex((x) => x.cable == cable);
        // Hit isn't defined in this PMT info
        if ( cable_i < 0 ) { continue }
        let pmt = pmt_info[cable_i];
        let hit_mat = new THREE.MeshBasicMaterial( 
            {color: PickColour(t_scaled)} );
        let mat = hit_mat;
        const mesh = new THREE.Mesh( pmt_geom, mat );
        mesh.name = "HIT";
        mesh.position.set( pmt.x, pmt.y, pmt.z );
        hit_pmts.push( mesh ); 
        scene.add( mesh );
    }
    
    return [hit_pmts, nohit_pmts]
}


function PlotPMTs2D( scene, event ) {
    console.log(event);
    const nhit = event.t.length;
    const clamp_frac = 0.1;
    const clamp_n_half = Math.round(clamp_frac*nhit/2);
    const t_sort = event.t.sort(function(a, b){return a - b});
    const t_max = t_sort[t_sort.length-clamp_n_half];
    const t_min = t_sort[clamp_n_half];
    // const t_max = Math.max(...event.t);
    // const t_min = Math.min(...event.t);

    const pmt_geom = new THREE.SphereGeometry( 25, 32, 16 );
    const nohit_mat = new THREE.MeshBasicMaterial( {color: 0x808080,
        transparent: true, opacity: 0.1} );
    const hit_mat = new THREE.MeshBasicMaterial( {color: 0xFFFF00} );

    function AddPMTsToScene( pmt_sub_info, offset=0, region=""){
        const caps_rot = - Math.PI/2;
        for (let pmt of pmt_sub_info) {
            let mat = nohit_mat;
            let name = "";
            if (event.cable.includes( pmt.cable )) {
                // Find index of pmt in the hits
                const cable_i = event.cable.findIndex((x) => x == pmt.cable);
                let t = event.t[cable_i];
                // Scale to a fraction of max and min
                // Scale for colour scale calculations
                let t_scaled = (t-t_min)/(t_max-t_min)
                if ( t > t_max ) {
                    t_scaled = 1;
                } else if ( t < t_min ) {
                    t_scaled = 0;
                } 
                mat = new THREE.MeshBasicMaterial( 
                    {color: PickColour(t_scaled)} );
                name = "HIT";
            };
            const mesh = new THREE.Mesh( pmt_geom, mat );
            mesh.name = name;
            if ( region == "wall" ){
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
                let scale = 0;
                if ( region == "top" ){ scale = -1 }
                else if ( region == "bottom" ){ scale = 1 }
                let pmt_vec = new THREE.Vector3( pmt.x, pmt.y, 0 )
                pmt_vec.applyAxisAngle( new THREE.Vector3( 0, 0, 1 ), caps_rot )
                pmt_vec.setY( scale*pmt_vec.y + offset )
                mesh.position.copy( pmt_vec )

                // let x = pmt.x;
                // let y = pmt.y;
                // x = x*Math.cos(caps_rot) - y*Math.sin(caps_rot);
                // y = x*Math.sin(caps_rot) + y*Math.cos(caps_rot);
                // mesh.position.set( x, y + offset, 0 );
            }
            scene.add( mesh );
        }
    }

    AddPMTsToScene( top_pmts, 2*SKHH, "top" );
    AddPMTsToScene( bot_pmts, -2*SKHH, "bottom" );
    AddPMTsToScene( wall_pmts, 0, "wall" );

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
const od_container = document.getElementById( "od_renderer" )
const xyz_container = document.getElementById( "xyz_renderer" )
// document.body.appendChild( container );

// Setup renderer
const renderer = new THREE.WebGLRenderer( {alpha: true, antialias: true} );
renderer.setSize( container.clientWidth, container.clientHeight );
container.appendChild( renderer.domElement );

const od_renderer = new THREE.WebGLRenderer( {alpha: true, antialias: true} );
od_renderer.setSize( od_container.clientWidth, od_container.clientHeight );
od_container.appendChild( od_renderer.domElement );

const xyz_renderer = new THREE.WebGLRenderer( {alpha: true, antialias: true} );
xyz_renderer.setSize( xyz_container.clientWidth, xyz_container.clientHeight );
xyz_container.appendChild( xyz_renderer.domElement );

// Setup a scene
const scene = new THREE.Scene();
const od_scene = new THREE.Scene();
const xyz_scene =  new THREE.Scene();

// Add all the meshes to the scene
// PlotDetector( scene );
// PlotHits( scene, hits );

// PlotPMTs2D( scene, pmt_info, event );
const pmts = PlotPMTs( scene, pmt_info_id, event_data );
const od_pmts = PlotPMTs( od_scene, pmt_info_od, event_data );
const hit_pmts = pmts[0];
const nohit_pmts = pmts[1];
// PlotVTX( scene, event_data )
PlotXYZ( xyz_scene )

// Setup a default camera (other control types like Ortho are available).
const d = 500;
// const aspect = window.innerWidth / window.innerHeight;
const aspect = container.clientWidth / container.clientHeight;
const camera = new THREE.PerspectiveCamera( 10, aspect, 1, 10000000 );
camera.zoom = 0.2;
camera.updateProjectionMatrix();

const od_aspect = od_container.clientWidth / od_container.clientHeight;
const od_camera = new THREE.PerspectiveCamera( 10, od_aspect, 1, 10000000 );
od_camera.zoom = 0.1;
od_camera.updateProjectionMatrix();

const xyz_aspect = 1;
const xyz_camera = new THREE.OrthographicCamera( -d*xyz_aspect, d*xyz_aspect, d,
    -d, 1, 100000 );

// Control camera with orbit controls
const controls = new OrbitControls( camera, renderer.domElement );
const od_controls = new OrbitControls( od_camera, renderer.domElement );
// Separate control
const xyz_controls = new OrbitControls( xyz_camera, renderer.domElement );
xyz_controls.enableZoom = false;
xyz_controls.enablePan = false;

camera.position.set( 0, 8000, 3000 );
camera.lookAt( 0, 0, 0 );
od_camera.position.set( 0, 8000, 3000 );
od_camera.lookAt( 0, 0, 0 );
xyz_camera.position.set( 0, 80000, 30000 );
xyz_camera.lookAt( 0, 0, 0 );

controls.autoRotate = true;
od_controls.autoRotate = true;
xyz_controls.autoRotate = true;

controls.saveState()
od_controls.saveState()
xyz_controls.saveState()

controls.update()
od_controls.update()

// const composer = new EffectComposer( renderer );
// const outlinePass = new OutlinePass(new THREE.Vector2(container.clientWidth,
//     container.clientHeight), scene, camera);
// composer.addPass( outlinePass );
// outlinePass.edgeStrength = 2;
// outlinePass.edgeGlow = params.edgeGlow;
// outlinePass.visibleEdgeColor.set(0xffffff);
// outlinePass.hiddenEdgeColor.set(0xffffff);

// renderer.render( scene, camera );
function animate() {
    controls.update()
    od_controls.update()
    xyz_controls.update()
	renderer.render( scene, camera );
    od_renderer.render( od_scene, od_camera );
	xyz_renderer.render( xyz_scene, xyz_camera );
	requestAnimationFrame( animate );
};
animate();

const next_btn = document.getElementById("next_button")
next_btn.addEventListener("click", nextEvent)

function nextEvent() {
    // Iterate event ID up, checking if it's out of array range 
    event_id++
    if(event_id == dataset.length){
        event_id = 0
    }
    resetAll()
}

const prev_btn = document.getElementById("prev_button")
prev_btn.addEventListener("click", prevEvent)

function prevEvent() {
    // Iterate event ID down, loop back to end of array if at start
    event_id--
    if(event_id < 0){
        event_id = dataset.length - 1
    }
    resetAll()
}

function resetAll() {
    event_no.value = event_id;
    dataset = datasets[dataset_id]
    event_data = dataset[event_id]
    clearScene( scene );
    clearScene( od_scene );
    clearScene( xyz_scene )
    controls.reset()
    od_controls.reset()
    xyz_controls.reset()

    Plotly.purge("thist_div")
    Plotly.purge("qhist_div")
    plotHists()
    console.log(event_id)
    // Retain view between events
    if ( view == "2D" ) {
        controls.autoRotate = false;
        od_controls.autoRotate = false;
        xyz_controls.autoRotate = false;
        // Plot the 2D evd, put camera above it
        PlotPMTs2D( scene, event_data );
        camera.position.set( 0, 0, 100000 );
        camera.lookAt( 0, 0, 0 );
        // Put far away to simulate ortho camera
        camera.fov = 1.5;
        camera.updateProjectionMatrix();
        // Easiest to just reset everything
        controls.saveState()
        xyz_controls.saveState()
        // Unbind roll, make lclick uses for pan. Can still roll with shift+click, disabling camera rotation doesn't fix for some reason
        controls.mouseButtons = {LEFT: rclk, MIDDLE: scrll, RIGHT: null};
    } else {
        controls.autoRotate = true;
        od_controls.autoRotate = true;
        xyz_controls.autoRotate = true;
        PlotPMTs( scene, pmt_info_id, event_data );
        PlotPMTs( od_scene, pmt_info_od, event_data );
        // PlotVTX( scene, event_data )
        PlotXYZ( xyz_scene )
        camera.position.set( 0, 8000, 3000 );
        camera.lookAt( 0, 0, 0 );
        camera.fov = 10;
        camera.updateProjectionMatrix();
        od_camera.position.set( 0, 8000, 3000 );
        od_camera.lookAt( 0, 0, 0 );
        od_camera.fov = 10;
        od_camera.updateProjectionMatrix();
        xyz_camera.position.set( 0, 80000, 30000 );
        xyz_camera.lookAt( 0, 0, 0 );
        controls.saveState()
        od_controls.saveState()
        xyz_controls.saveState()
        // Standard orbit controls
        controls.mouseButtons = {LEFT: lclk, MIDDLE: scrll, RIGHT: rclk};
    }
    return
}


const reset_btn = document.getElementById("reset_button"); 
reset_btn.addEventListener("click", resetView)

function resetView() { 
    controls.reset()
    od_controls.reset()
    xyz_controls.reset()
    return
}

const view_btn = document.getElementById("change_view_button")
view_btn.addEventListener("click", changeView)

function clearScene( scene ) {
    for (let i = scene.children.length - 1; i >= 0; i--) {
        const child_type = scene.children[i].type;
        if(child_type == "Mesh" || child_type == "ArrowHelper")
            scene.remove(scene.children[i]);
    }
}

let view = "3D";
const lclk = THREE.MOUSE.LEFT;
const rclk = THREE.MOUSE.RIGHT;
const scrll = THREE.MOUSE.MIDDLE;

// Switch between 3D and 2D 
function changeView() {
    clearScene( scene );
    clearScene( od_scene );
    clearScene( xyz_scene )
    controls.reset()
    od_controls.reset()
    xyz_controls.reset()
    // If view is 3D, switch to 2D
    if ( view == "3D" ) {
        controls.autoRotate = false;
        od_controls.autoRotate = false;
        xyz_controls.autoRotate = false;
        // Plot the 2D evd, put camera above it
        PlotPMTs2D( scene, event_data );
        camera.position.set( 0, 0, 100000 );
        camera.lookAt( 0, 0, 0 );
        // Put far away to simulate ortho camera
        camera.fov = 1.5;
        camera.updateProjectionMatrix();
        view = "2D";
        // Easiest to just reset everything
        controls.saveState()
        xyz_controls.saveState()
        // Unbind roll, make lclick uses for pan. Can still roll with 
        // shift+click, disabling camera rotation doesn't fix for some reason
        controls.mouseButtons = {LEFT: rclk, MIDDLE: scrll, RIGHT: null};
    } else {
        controls.autoRotate = true;
        od_controls.autoRotate = true;
        xyz_controls.autoRotate = true;
        PlotPMTs( scene, pmt_info_id, event_data );
        PlotPMTs( od_scene, pmt_info_od, event_data );
        // PlotVTX( scene, event_data )
        PlotXYZ( xyz_scene )
        view = "3D";
        camera.position.set( 0, 8000, 3000 );
        camera.lookAt( 0, 0, 0 );
        camera.fov = 10;
        camera.updateProjectionMatrix();
        od_camera.position.set( 0, 8000, 3000 );
        od_camera.lookAt( 0, 0, 0 );
        od_camera.fov = 10;
        od_camera.updateProjectionMatrix();
        xyz_camera.position.set( 0, 80000, 30000 );
        xyz_camera.lookAt( 0, 0, 0 );
        controls.saveState()
        od_controls.saveState()
        xyz_controls.saveState()
        // Standard orbit controls
        controls.mouseButtons = {LEFT: lclk, MIDDLE: scrll, RIGHT: rclk};
    }

    return
}

function onWindowResize() {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( container.clientWidth, container.clientHeight );

    od_camera.aspect = od_container.clientWidth / od_container.clientHeight;
    od_camera.updateProjectionMatrix();
    od_renderer.setSize( od_container.clientWidth, od_container.clientHeight );

    xyz_camera.aspect = xyz_container.clientWidth / xyz_container.clientHeight;
    xyz_camera.updateProjectionMatrix();
    xyz_renderer.setSize( xyz_container.clientWidth, xyz_container.clientHeight );
}

window.onresize = () => onWindowResize();


let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2()

function onClick() {
    // Stop the detector rotating
    controls.autoRotate = false;
    od_controls.autoRotate = false;
    xyz_controls.autoRotate = false;

    mouse.x = (event.clientX / container.clientWidth) * 2 - 1;
    mouse.y = -(event.clientY / container.clientHeight) * 2 + 1;
  
    raycaster.setFromCamera(mouse, camera);
  
    var intersects = raycaster.intersectObjects(scene.children, false);
  
    if (intersects.length > 0) {
        for ( let i = 0; i < intersects.length; i++) {
            const object = intersects[i].object;
            if ( object.name == "HIT" ){
                console.log(mouse)
                outlinePass.selectedObjects = [object];
                // object.material.color.set( "rgb(255,0,0)" );
                // Don't want to set everything behind it too
                break;
            }
        }
    }
      
    renderer.render( scene, camera );
    // composer.render( scene, camera );
  }

renderer.domElement.addEventListener('click', onClick, true);

// Now print out event information
const run_info_str = `Run: ${event_data.nrunsk} 
    Subrun: ${event_data.nsubsk} 
    Date: ${event_data.year}-${event_data.month}-${event_data.day}

    Trigid: ${event_data.trigid}
    BONSAI Energy: ${event_data.bsenergy.toFixed(3)} MeV
    `;
const run_info = document.getElementById("run_info_text");
const run_text = document.createTextNode(run_info_str);

run_info.appendChild(run_text);

// Print event number into input field, get it to get a specific event
const event_no = document.getElementById("event_no");
const event_no_err = document.getElementById("event_no_err")
// event_no.value = event_data.nevsk;
event_no.value = event_id;
event_no.addEventListener("keyup", function (e) {
    if (e.key === "Enter") {
        // Ensure event ID is within range of dataset
        event_id = Math.min(event_no.value, (dataset.length-1))
        event_id = Math.max(event_id, 0)
        resetAll()
    }
});

function plotHists() {
    // Plot Q and T histograms
    const thist = {
        x: event_data.t,
        type: "histogram",
    };
    const tdata = [thist];
    Plotly.newPlot("thist_div", tdata, thist_layout);

    const qhist = {
        x: event_data.q,
        type: "histogram",
    };
    const qdata = [qhist];
    Plotly.newPlot("qhist_div", qdata, qhist_layout);

}

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

plotHists()

// scene.matrixAutoUpdate = false;
// scene.autoUpdate = false;