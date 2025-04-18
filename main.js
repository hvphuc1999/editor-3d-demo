import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { TransformControls } from "three/addons/controls/TransformControls.js";
import { BOX_TYPES } from "./constants";

function main() {
  let renderer;
  const rendererEle = document.getElementById("renderer");
  const rendererWidth = rendererEle.offsetWidth;
  const rendererHeight = rendererEle.offsetHeight;
  let scene, camera, orbitControl, transformControl, raycaster, mouse;
  let objectList = [];

  init();
  render();

  const addNewIdList = ["add-new-cube", "add-new-sphere", "add-new-cone", "add-new-cylinder"];
  addNewIdList.forEach(addNewId => {
    const addNewCube = document.getElementById(addNewId);
    const boxType = getBoxTypeByIdEle(addNewId);
    addNewCube.addEventListener("click", () => {
      createMesh(boxType);
    });
  });

  function init() {
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(rendererWidth, rendererHeight);
    document.getElementById("renderer").appendChild(renderer.domElement);

    scene = new THREE.Scene();
    scene.add(new THREE.GridHelper(10, 20, 0x888888, 0x444444));

    camera = new THREE.PerspectiveCamera(
      75,
      rendererWidth / rendererHeight,
      0.1,
      1000
    );
    camera.position.set(5, 2.5, 5);

    orbitControl = new OrbitControls(camera, renderer.domElement);
    orbitControl.update();
    orbitControl.addEventListener("change", render);

    transformControl = new TransformControls(
      camera,
      renderer.domElement
    );
    transformControl.addEventListener("change", render);
    transformControl.addEventListener("dragging-changed", function (event) {
      orbitControl.enabled = !event.value;
    });

    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    renderer.domElement.addEventListener('click', onCanvasClick, false);

    window.addEventListener("resize", onWindowResize);
  }

  function render() {
    renderer.render(scene, camera);
  }

  function onWindowResize() {
    const rendererEle = document.getElementById("renderer");
    const aspect = rendererEle.offsetWidth / rendererEle.offsetHeight;
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    renderer.setSize(rendererEle.offsetWidth, rendererEle.offsetHeight);
    render();
  }

  function onCanvasClick(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;


    raycaster.setFromCamera(mouse, camera);

    const meshesToCheck = objectList.map(item => item.mesh); // Get only the mesh objects
    const intersects = raycaster.intersectObjects(meshesToCheck, false); // `false` means don't check children

    if (intersects.length > 0) {
      const intersectedObject = intersects[0].object;

      const htmlElementId = intersectedObject.uuid;
      const targetElement = document.getElementById(htmlElementId);
      if (targetElement) targetElement.click();
    } else {
      // handleUnselectOfCurrentSelectedMesh();
    }
  }

  function createMesh(type) {
    /* Create geometry by type and add color material default */
    let geometry;
    const defaultSize = 1; // Base size for dimensions/radius/height
    const segments = 32;   // Segments for curved shapes (more = smoother)

    switch (type) {
      case BOX_TYPES.CUBE:
        geometry = new THREE.BoxGeometry(defaultSize, defaultSize, defaultSize);
        break;
      case BOX_TYPES.SPHERE:
        // SphereGeometry(radius, widthSegments, heightSegments)
        geometry = new THREE.SphereGeometry(defaultSize/ 2, segments, segments);
        break;
      case BOX_TYPES.CONE:
        // ConeGeometry(radius, height, radialSegments)
        geometry = new THREE.ConeGeometry(defaultSize / 2, defaultSize, segments);
        break;
      case BOX_TYPES.CYLINDER:
        // CylinderGeometry(radiusTop, radiusBottom, height, radialSegments)
        geometry = new THREE.CylinderGeometry(defaultSize / 2, defaultSize / 2, defaultSize, segments);
        break;
      default:
        geometry = new THREE.BoxGeometry(defaultSize, defaultSize, defaultSize);
    }
    const material = new THREE.MeshBasicMaterial({ color: Math.random() * 0xffffff });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    /* ===================== */


    /* Create Object Item Element in DOM */
    const meshId = mesh.uuid;
    const objectListEle = document.querySelector(".object-list");
    const objectEle = document.createElement("div");
    objectEle.classList.add("object-item");
    objectEle.id = meshId;
    
    objectEle.addEventListener("click", () => {
      handleSelectMesh(mesh);
    });

    const objectLogoEle = document.createElement("img");
    objectLogoEle.src = "./boxes.svg";
    objectLogoEle.width = 18;
    objectLogoEle.height = 18;
    objectEle.appendChild(objectLogoEle);

    const objectTitleEle = document.createElement("div");
    objectTitleEle.classList.add("object-item__title");
    objectTitleEle.textContent = `${type}-${meshId}`;
    objectEle.appendChild(objectTitleEle);

    objectListEle.appendChild(objectEle);
    objectList.push({
      id: meshId,
      mesh,
    })
    /* ===================== */

    render();

    return mesh;
  }
  
  function handleUnselectOfCurrentSelectedMesh() {
    const currentSelectedObjectEle = document.querySelector(
      ".object-item--selected"
    );
    if (!currentSelectedObjectEle) return;
    currentSelectedObjectEle.classList.remove("object-item--selected");
    const trash = document.getElementById(`trash-${currentSelectedObjectEle.id}`);
    if (trash) trash.remove();
    const currentSelectedObject = objectList.find(item => item.id === currentSelectedObjectEle.id);
    if (currentSelectedObject) {
      const gizmo = transformControl.getHelper();
      scene.remove(gizmo);
      transformControl.detach(currentSelectedObject.mesh)
      transformControl.setMode('translate')
    }
    removePropertiesSection();
    render();
  }

  function handleRemoveMesh(mesh) {
    if (!mesh) return;
    const gizmo = transformControl.getHelper();
    scene.remove(gizmo);
    transformControl.detach(mesh)
    mesh.geometry.dispose();
    mesh.material.dispose();
    scene.remove(mesh);
    objectList = objectList.filter(item => item.id !== mesh.uuid);
    render();

    handleUnselectOfCurrentSelectedMesh();
    const objectEle = document.getElementById(mesh.uuid);
    if (objectEle) objectEle.remove();
  }

  function getBoxTypeByIdEle(idEle) {
    switch(idEle) {
      case "add-new-cube":
        return BOX_TYPES.CUBE;
      case "add-new-sphere":
        return BOX_TYPES.SPHERE;
      case "add-new-cone":
        return BOX_TYPES.CONE;
      case "add-new-cylinder":
        return BOX_TYPES.CYLINDER;
      default:
        return BOX_TYPES.CUBE;
    }
  }

  function handleSelectMesh(mesh) {
    if (!mesh) return;

    const currentSelectedObjectEle = document.querySelector(
      ".object-item--selected"
    );
    if (currentSelectedObjectEle && currentSelectedObjectEle.id === mesh.uuid) return;
    handleUnselectOfCurrentSelectedMesh();

    const objectEle = document.getElementById(mesh.uuid);
    objectEle.classList.add("object-item--selected");

    /* Add transform control */
    transformControl.attach(mesh);
    const gizmo = transformControl.getHelper();
    scene.add(gizmo);
    /* ===================== */

    const objectTrashEle = document.createElement("img");
    objectTrashEle.id = `trash-${mesh.uuid}`
    objectTrashEle.src = "./trash.svg";
    objectTrashEle.width = 18;
    objectTrashEle.height = 18;
    objectEle.appendChild(objectTrashEle);
    objectTrashEle.addEventListener("click", (e) => {
      e.stopPropagation();
      handleRemoveMesh(mesh);
    });

    render();

    renderPropertiesSection(mesh)
  }

  function renderPropertiesSection(mesh) {
    const objectPropertiesEle = document.querySelector('.object-properties')

    /* Transform property */
    const transformPropertyEle = document.createElement('div');
    transformPropertyEle.classList.add('object-property');
    const moveEle = document.createElement('div');
    moveEle.classList.add('transform-icon');
    moveEle.classList.add('transform-icon--selected');
    const moveIcon = document.createElement('img');
    moveIcon.src = './move.svg';
    moveEle.appendChild(moveIcon);
    moveEle.addEventListener('click', () => {
      const currentSelectedModeEle = document.querySelector('.transform-icon--selected')
      currentSelectedModeEle.classList.remove('transform-icon--selected')
      moveEle.classList.add('transform-icon--selected');
      transformControl.setMode('translate');
    });
    transformPropertyEle.appendChild(moveEle)

    const rotateEle = document.createElement('div');
    rotateEle.classList.add('transform-icon');
    const rotateIcon = document.createElement('img');
    rotateIcon.src = './rotate.svg';
    rotateEle.appendChild(rotateIcon);
    rotateEle.addEventListener('click', () => {
      const currentSelectedModeEle = document.querySelector('.transform-icon--selected')
      currentSelectedModeEle.classList.remove('transform-icon--selected')
      rotateEle.classList.add('transform-icon--selected');
      transformControl.setMode('rotate');
    });
    transformPropertyEle.appendChild(rotateEle)

    const scaleEle = document.createElement('div');
    scaleEle.classList.add('transform-icon');
    const scaleIcon = document.createElement('img');
    scaleIcon.src = './scale.svg';
    scaleEle.appendChild(scaleIcon);
    scaleEle.addEventListener('click', () => {
      const currentSelectedModeEle = document.querySelector('.transform-icon--selected')
      currentSelectedModeEle.classList.remove('transform-icon--selected')
      scaleEle.classList.add('transform-icon--selected');
      transformControl.setMode('scale');
    });
    transformPropertyEle.appendChild(scaleEle)

    objectPropertiesEle.appendChild(transformPropertyEle);
    /* ===================== */
  }

  function removePropertiesSection() {
    const objectPropertiesEle = document.querySelector('.object-properties')
    objectPropertiesEle.innerHTML = '';
  }
}

main();
