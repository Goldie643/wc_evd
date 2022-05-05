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
// FOR THE THREE JS CONVENTION *NOT* SK
function PlotXYZ( scene ) {
    // Now add an arrow for direction
    const x = new THREE.Vector3( 1, 0, 0 );
    const y = new THREE.Vector3( 0, 1, 0 );
    const z = new THREE.Vector3( 0, 0, 1 );
    const origin = new THREE.Vector3( SKR+200, SKR+200, -SKHH );
    const l = 1000;
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

// Plot all PMTs from pmt_info
function PlotPMTs( scene, pmt_info, hits=[] ) {
    const pmt_geom = new THREE.SphereGeometry( 25, 32, 16 );
    const nohit_mat = new THREE.MeshBasicMaterial( {color: 0x808080,
        transparent: true, opacity: 0.1} );
    const hit_mat = new THREE.MeshBasicMaterial( {color: 0xFFFF00} )
    for (let pmt of pmt_info) {
        let mat = nohit_mat;
        if (hits.includes( pmt.cable )) {
            mat = hit_mat;
        };
        const mesh = new THREE.Mesh( pmt_geom, mat );
        mesh.position.set( pmt.x, pmt.y, pmt.z );
        scene.add( mesh );
    }
    
    return
}

function PlotVTX( scene, vtx ) {
    const geom = new THREE.SphereGeometry( 25, 32, 16 );
    const mat = new THREE.MeshBasicMaterial( {color: 0xFF0000} );
    const mesh = new THREE.Mesh( geom, mat );

    mesh.position.set( vtx.x, vtx.y, vtx.z );
    scene.add( mesh );

    // Now add an arrow for direction
    const dir = new THREE.Vector3( vtx.x_dir, vtx.y_dir, vtx.z_dir );
    dir.normalize();
    const origin = new THREE.Vector3( vtx.x, vtx.y, vtx.z );
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

    // Align with event dir
    // First point in +ve x
    cone.rotateZ( Math.PI / 2 )
    // Then rotate according to direction angles from BONSAI
    cone.rotateY( vtx.phi )
    // TODO: This shouldn't be negative, but it works *most* of the time
    // A sign must be messed up somewhere
    cone.rotateZ( - vtx.theta )

    cone.position.set( 
        vtx.x + (vtx.x_dir*cone_l/2),
        vtx.y + (vtx.y_dir*cone_l/2),
        vtx.z + (vtx.z_dir*cone_l/2)
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
    
    return
}

// Setup renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Setup a scene
const scene = new THREE.Scene();

// Add all the meshes to the scene
// PlotDetector( scene );
// PlotHits( scene, hits );
PlotPMTs( scene, pmt_info, event.cable );
PlotVTX( scene, event )
PlotXYZ( scene )

// Setup a default camera (other control types like Ortho are available).
const camera = new THREE.PerspectiveCamera( 45, window.innerWidth /
    window.innerHeight, 1, 100000 );

// Control camera with orbit controls
const controls = new OrbitControls( camera, renderer.domElement );

camera.position.set( 0, 10000, 5000 );
camera.lookAt( 0, 0, 0 );

controls.update()

// renderer.render( scene, camera );
function animate() {
    controls.update()
	requestAnimationFrame( animate );
	renderer.render( scene, camera );
};
animate();