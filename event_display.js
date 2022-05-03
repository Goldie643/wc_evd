// Event Display Code

// Some hard coded detector geometry (to be later sent via the server).
const detector = [];
detector.push( new THREE.Vector3( - 10, 0, 0 ) );
detector.push( new THREE.Vector3( 0, 10, 0 ) );
detector.push( new THREE.Vector3( 10, 0, 0 ) );

// Use and convert detector geo into an actual mesh.
function PlotDetector(detector) {
    const geometry = new THREE.CylinderGeometry( 5, 5, 20, 32 );
    // const geometry = new THREE.CylinderGeometry( 1690, 1690, 2*1810, 64);
    const material = new THREE.MeshBasicMaterial( {color: 0x808080, transparent:
        true, opacity: 0.5} );
    const mesh = new THREE.Mesh( geometry, material );

    // const geometry = new THREE.BufferGeometry().setFromPoints(detector);
    // const material = new THREE.LineBasicMaterial( { color: 0x0000ff } );
    // const mesh = new THREE.Line(geometry, material);

    return mesh;
}

// Setup a default camera (other control types like Ortho are available).
const camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 500 );
// const controls = new OrbitControls( camera, renderer.domElement );
camera.position.set( 0, 0, 100 );
// controls.update()
camera.lookAt( 0, 0, 0 );

// Setup a scene, where shit lives, including add the detector
const scene = new THREE.Scene();
const detectorMesh = PlotDetector(detector);
scene.add(detectorMesh);

// Now actually start to render stuff
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// renderer.render( scene, camera );
function animate() {
	requestAnimationFrame( animate );
	renderer.render( scene, camera );
};
animate();