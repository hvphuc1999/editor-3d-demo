import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { TransformControls } from "three/addons/controls/TransformControls.js";
import { BOX_TYPES } from "./constants";

function main() {
  let renderer;
  const rendererEle = document.getElementById("renderer");
  const rendererWidth = rendererEle.offsetWidth;
  const rendererHeight = rendererEle.offsetHeight;
  let scene, camera, orbitControl, transformControl, raycaster, mouse, directionalLight;
  let objectList = [];
  let isLightOn = false;

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

  const lightEle = document.getElementById("light");
  lightEle.addEventListener("click", () => {
    if (!isLightOn) {
      handleTurnOnLight();
    } else {
      handleTurnOffLight();
    }
  });

  function init() {
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(rendererWidth, rendererHeight);
    document.getElementById("renderer").appendChild(renderer.domElement);

    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xeeeeff);
    scene.add(new THREE.GridHelper(30, 30, 0x888888, 0xcccccc));

    const planeGeometry = new THREE.PlaneGeometry(30, 30);
    const planeMaterial = new THREE.MeshStandardMaterial({
        color: 0xcccccc,
        side: THREE.DoubleSide
    });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = 0;
    plane.receiveShadow = true;
    scene.add(plane);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    camera = new THREE.PerspectiveCamera(
      60,
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
    transformControl.addEventListener("change", () => {
      handleTransformObjectChange();
    });
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
    const material = new THREE.MeshStandardMaterial({
      color: Math.random() * 0xffffff,
      roughness: 0.7,
      metalness: 0.1
  });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    const geomParams = geometry.parameters || {};
    let halfHeight = defaultSize / 2;
    if (geomParams.height) {
        halfHeight = geomParams.height / 2;
    } else if (geomParams.radius) {
        halfHeight = geomParams.radius;
    }
    mesh.position.y = halfHeight; 
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

    const objectTrashEle = document.createElement("img");
    objectTrashEle.id = `trash-${mesh.uuid}`
    objectTrashEle.src = "./trash.svg";
    objectTrashEle.width = 18;
    objectTrashEle.height = 18;
    objectTrashEle.style = "visibility: hidden";
    objectEle.appendChild(objectTrashEle);
    objectTrashEle.addEventListener("click", (e) => {
      e.stopPropagation();
      handleRemoveMesh(mesh);
    });

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
    if (trash) trash.style = 'visibility: hidden';
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

    const objectTrashEle = document.getElementById(`trash-${mesh.uuid}`);
    if (objectTrashEle) objectTrashEle.style = "display: block"

    render();

    renderPropertiesSection(mesh)
  }

  function renderPropertiesSection(mesh) {
    const objectPropertiesEle = document.querySelector('.object-properties')

    /* Transform property */
    const transformIconPropertyEle = document.createElement('div');
    transformIconPropertyEle.classList.add('object-property');
    transformIconPropertyEle.style = "display: flex; align-items: center; column-gap: 2rem;"

    const transformIconList = [
      {
        selectedDefault: true,
        iconPath: './move.svg',
        mode: 'translate',
      },
      {
        iconPath: './rotate.svg',
        mode: 'rotate',
      },
      {
        iconPath: './scale.svg',
        mode: 'scale',
      },
    ]
    const renderTransformIcon = ({ selectedDefault = false, iconPath, mode }) => {
      const transformTypeEle = document.createElement('div');
      transformTypeEle.classList.add('transform-icon');
      if (selectedDefault) transformTypeEle.classList.add('transform-icon--selected');
      const iconEle = document.createElement('img');
      iconEle.src = iconPath;
      transformTypeEle.appendChild(iconEle);
      transformTypeEle.addEventListener('click', () => {
        const currentSelectedModeEle = document.querySelector('.transform-icon--selected')
        currentSelectedModeEle.classList.remove('transform-icon--selected')
        transformTypeEle.classList.add('transform-icon--selected');
        transformControl.setMode(mode);
      });
      transformIconPropertyEle.appendChild(transformTypeEle)
    }
    transformIconList.forEach(renderTransformIcon)

    objectPropertiesEle.appendChild(transformIconPropertyEle);
    /* ===================== */

    /* Position, Rotation, Scale property */
    const transformTypeByAxisList = ['position', 'rotation', 'scale']
    const renderTransformByAxisProperty = (type) => {
      const axisPropertyEle = document.createElement('div');
      axisPropertyEle.classList.add('object-property');
  
      const titleEle = document.createElement('div')
      titleEle.textContent = type.slice(0, 1).toUpperCase() + type.slice(1)
      titleEle.style = 'font-size: 1.25rem; margin-bottom: 1rem;'
      axisPropertyEle.appendChild(titleEle);
  
      const xyzContainerEle = document.createElement('div');
      xyzContainerEle.classList.add('xyz-axis-input-container');

      const axisInputList = [
        {
          axisName: 'X',
          inputId:  `${type}-x-input`,
        },
        {
          axisName: 'Y',
          inputId: `${type}-y-input`,
        },
        {
          axisName: 'Z',
          inputId: `${type}-z-input`,
        },
      ]
      const renderAxisInput = ({ axisName, inputId }) => {
        const axisContainerEle = document.createElement('div');
        const axisEle = document.createElement('div');
        axisEle.textContent = axisName
        axisEle.style = "margin-bottom: 0.5rem"
        const axisInputEle = document.createElement('input');
        axisInputEle.id = inputId;
        axisInputEle.type = 'number';
        axisInputEle.value = mesh?.[`${type}`].x;
        axisInputEle.onchange = (e) => {
          const value = e.target.value;
          if (axisName.toLowerCase() === 'x') mesh.scale.set(value, mesh?.[`${type}`].y, mesh?.[`${type}`].z)
          if (axisName.toLowerCase() === 'y') mesh.scale.set(mesh?.[`${type}`].x, value, mesh?.[`${type}`].z)
          if (axisName.toLowerCase() === 'z') mesh.scale.set(mesh?.[`${type}`].x, mesh?.[`${type}`].y, value)
          render()
        }
        axisContainerEle.appendChild(axisEle);
        axisContainerEle.appendChild(axisInputEle);
        xyzContainerEle.appendChild(axisContainerEle);
      }
      axisInputList.forEach(renderAxisInput);
  
      axisPropertyEle.appendChild(xyzContainerEle);
      objectPropertiesEle.appendChild(axisPropertyEle);
    }
    transformTypeByAxisList.forEach(renderTransformByAxisProperty);
    /* ===================== */

    /* Color property */
    const colorContainer = document.createElement('div');
    colorContainer.classList.add('object-property');
    colorContainer.style = "display: flex; align-items: center; column-gap: 1rem;"
    const colorLabel = document.createElement('label');
    colorLabel.style = 'font-size: 1.25rem;'
    colorLabel.textContent = 'Color:';
    colorContainer.appendChild(colorLabel);

    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.id = 'meshColorPicker';
    colorInput.value = `#${mesh.material.color.getHexString()}`;
    colorInput.addEventListener('input', (event) => {
        if (mesh.material && mesh.material.color) {
            mesh.material.color.set(event.target.value);
            render();
        }
    });
    colorContainer.appendChild(colorInput);
    objectPropertiesEle.appendChild(colorContainer); // Add color picker container
    /* ===================== */
  }

  function removePropertiesSection() {
    const objectPropertiesEle = document.querySelector('.object-properties')
    objectPropertiesEle.innerHTML = '';
  }

  function handleTransformObjectChange() {
    const listChangeId = [
      {
        inputId: 'position-x-input',
        type: 'position',
        axisName: 'x',
      },
      {
        inputId: 'position-y-input',
        type: 'position',
        axisName: 'y',
      },
      {
        inputId: 'position-z-input',
        type: 'position',
        axisName: 'z',
      },
      {
        inputId: 'rotation-x-input',
        type: 'rotation',
        axisName: 'x',
      },
      {
        inputId: 'rotation-y-input',
        type: 'rotation',
        axisName: 'y',
      },
      {
        inputId: 'rotation-z-input',
        type: 'rotation',
        axisName: 'z',
      },
      {
        inputId: 'scale-x-input',
        type: 'scale',
        axisName: 'x',
      },
      {
        inputId: 'scale-y-input',
        type: 'scale',
        axisName: 'y',
      },
      {
        inputId: 'scale-z-input',
        type: 'scale',
        axisName: 'z',
      },
    ]
    const handleChangeAxis = ({ inputId, type, axisName }) => {
      const inputEle = document.getElementById(inputId);
      if (inputEle && transformControl) inputEle.value = transformControl?.object?.[`${type}`]?.[`${axisName}`];
    }
    listChangeId.forEach(handleChangeAxis);
    render()
  }

  function handleTurnOnLight() {
    isLightOn = true;
    if (!directionalLight) {
      directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(10, 15, 10);
      directionalLight.castShadow = true;
  
      directionalLight.shadow.mapSize.width = 1024;
      directionalLight.shadow.mapSize.height = 1024;
      directionalLight.shadow.camera.near = 0.5;
      directionalLight.shadow.camera.far = 50;
    }
    const lightImg = document.getElementById('light-img');
    lightImg.src = './light-on.svg';
    scene.add(directionalLight);
    render();
  }

  function handleTurnOffLight() {
    isLightOn = false;
    if (!directionalLight) return;
    const lightImg = document.getElementById('light-img');
    lightImg.src = './light-off.svg';
    scene.remove(directionalLight);
    render();
  }
}

main();
