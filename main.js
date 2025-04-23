import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { TransformControls } from "three/addons/controls/TransformControls.js";
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { BOX_TYPES } from "./constants";

function main() {
  let renderer;
  const rendererEle = document.getElementById("renderer");
  const rendererWidth = rendererEle.offsetWidth;
  const rendererHeight = rendererEle.offsetHeight;
  let scene, camera, orbitControl, transformControl, raycaster, mouse, directionalLight;
  let objectList = [];
  let isLightOn = true;
  let animationFrameIdList = null;
  let modalProperties = {
    material: {
      body: null
    }
  }
  let carModel;

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
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.85;

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

    if (isLightOn) handleTurnOnLight();

    loadModel();
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

    // Check for car model first
    if (carModel) {
        const carIntersects = raycaster.intersectObject(carModel, true);
        if (carIntersects.length > 0) {
            handleSelectModal(carModel);
            return;
        }
    }

    // Then check other meshes
    const meshesToCheck = objectList.map(item => item.mesh);
    const intersects = raycaster.intersectObjects(meshesToCheck, false);

    if (intersects.length > 0) {
        const intersectedObject = intersects[0].object;
        const htmlElementId = intersectedObject.uuid;
        const targetElement = document.getElementById(htmlElementId);
        if (targetElement) targetElement.click();
    } else {
        handleUnselectOfCurrentSelectedMesh();
    }
  }

  function loadModel() {
    // Load Ferrari model
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');

    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);

    // Materials
    modalProperties.material.body = new THREE.MeshPhysicalMaterial({
        color: 0xff0000,
        metalness: 1.0,
        roughness: 0.5,
        clearcoat: 1.0,
        clearcoatRoughness: 0.03
    });

    loader.load('./ferrari.glb', function (gltf) {
        carModel = gltf.scene.children[0];
        carModel.name = 'Car'
        
        // Apply materials
        carModel.getObjectByName('body').material = modalProperties.material.body;

        scene.add(carModel);

        addObjectToUIList(carModel, 'modal');

        render();
    });
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
    mesh.name = `${type}-${mesh.uuid.substring(0, 6)}`;
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


    /* Add to internal list and UI list using helpers */
    addObjectToInternalList(mesh);
    addObjectToUIList(mesh);
    /* ===================== */

    // Select the newly created mesh
    handleSelectMesh(mesh);

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
    const copy = document.getElementById(`copy-${currentSelectedObjectEle.id}`);
    if (copy) copy.style = 'visibility: hidden';
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

    const objectCopyEle = document.getElementById(`copy-${mesh.uuid}`);
    if (objectCopyEle) objectCopyEle.style = "display: block"

    render();

    renderPropertiesSection(mesh)
  }

  function renderPropertiesSection(obj, type = 'mesh') {
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
        axisInputEle.value = obj?.[`${type}`].x;
        axisInputEle.onchange = (e) => {
          const value = e.target.value;
          if (axisName.toLowerCase() === 'x') obj.scale.set(value, obj?.[`${type}`].y, obj?.[`${type}`].z)
          if (axisName.toLowerCase() === 'y') obj.scale.set(obj?.[`${type}`].x, value, obj?.[`${type}`].z)
          if (axisName.toLowerCase() === 'z') obj.scale.set(obj?.[`${type}`].x, obj?.[`${type}`].y, value)
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
    colorInput.value = type === 'mesh' ? `#${obj.material.color.getHexString()}` : `#${modalProperties.material.body.color.getHexString()}`;
    colorInput.addEventListener('input', (event) => {
        if (obj.material && obj.material.color && type === 'mesh') obj.material.color.set(event.target.value)
        if (type === 'modal') modalProperties.material.body.color.set(event.target.value);
        render();
    });
    colorContainer.appendChild(colorInput);
    objectPropertiesEle.appendChild(colorContainer); // Add color picker container
    /* ===================== */

    const animateTitle = document.createElement('div');
    animateTitle.classList.add('object-property');
    animateTitle.textContent = 'Effect';
    animateTitle.style = 'font-size: 1.25rem';

    const animateContainer = document.createElement('div');
    animateContainer.style = "display: flex; align-items: center; column-gap: 1rem; padding: 0 1rem 1rem 1rem"

    let animationFrameId;
    // let originalTransform = {
    //   position: { x: mesh.position.x, y: mesh.position.y, z: mesh.position.z },
    //   rotation: { x: mesh.rotation.x, y: mesh.rotation.y, z: mesh.rotation.z },
    //   scale: { x: mesh.scale.x, y: mesh.scale.y, z: mesh.scale.z },
    // }

    const clearAnimation = (selectedMesh) => {
      if (!selectedMesh) return;
      const id = animationFrameIdList?.[`${selectedMesh.uuid}`]
      cancelAnimationFrame(id);
      animationFrameId = null;
      // Reset position when animation stops
      // mesh.position.x = originalTransform.position.x;
      // mesh.position.y = originalTransform.position.y;
      // mesh.position.z = originalTransform.position.z;

      // mesh.rotation.x = originalTransform.rotation.x;
      // mesh.rotation.y = originalTransform.rotation.y;
      // mesh.rotation.z = originalTransform.rotation.z;

      // mesh.scale.x = originalTransform.scale.x;
      // mesh.scale.y = originalTransform.scale.y;
      // mesh.scale.z = originalTransform.scale.z;
      render();
    }

    const animateList = [
      {
        name: 'None',
        onChange: (checkbox) => {
          let isAnimating = false;

          checkbox.addEventListener('change', (e) => {
            isAnimating = e.target.checked;
            if (!isAnimating) return;
            clearAnimation(obj);
            obj.userData.animationType = null;
          });
        },
        defaultChecked: !obj.userData.animationType
      },
      {
        name: 'Rotate',
        onChange: (checkbox) => {
          let isAnimating = false;

          checkbox.addEventListener('change', (e) => {
            isAnimating = e.target.checked;
            clearAnimation(obj);
            if (isAnimating) {
              obj.userData.animationType = 'Rotate';
              function animate() {

                obj.rotation.y += 0.01;
                
                render();
                animationFrameId = requestAnimationFrame(animate);
                animationFrameIdList = {
                  ...animationFrameIdList,
                  [`${obj.uuid}`]: animationFrameId
                }
              }
              animate();
            }
          });
        },
        defaultChecked: obj.userData.animationType === 'Rotate'
      },
      {
        name: 'Balloon',
        onChange: (checkbox) => {
          let isAnimating = false;
          checkbox.addEventListener('change', (e) => {
            isAnimating = e.target.checked;
            let originalY = obj.position.y;

            clearAnimation(obj);

            if (isAnimating) {
              obj.userData.animationType = 'Balloon';
              function animate() {
                
                // Balloon-like floating animation
                const time = Date.now() * 0.001; // Convert to seconds
                const amplitude = 0.5; // Maximum height of the floating motion
                const floatHeight = Math.sin(time) * amplitude; // Oscillate between -amplitude and amplitude
                obj.position.y = originalY + floatHeight;
                
                render();
                animationFrameId = requestAnimationFrame(animate);
                animationFrameIdList = {
                  ...animationFrameIdList,
                  [`${obj.uuid}`]: animationFrameId
                }
              }
              animate();
            }
          });
        },
        defaultChecked: obj.userData.animationType === 'Balloon'
      }
    ]

    const renderAnimate = ({
      name = '',
      onChange = () => {},
      defaultChecked = false
    }) => {
      const animateLabel = document.createElement('label');
      animateLabel.textContent = name;
      animateLabel.style = 'font-size: 1rem;'
      
      const animateCheckbox = document.createElement('input');
      animateCheckbox.type = 'radio';
      animateCheckbox.name = 'effect_group';
      animateCheckbox.style = 'margin: 0';
      animateCheckbox.defaultChecked = defaultChecked;
      
      onChange(animateCheckbox)
      
      animateContainer.appendChild(animateLabel);
      animateContainer.appendChild(animateCheckbox);
    }

    animateList.forEach(renderAnimate)

    objectPropertiesEle.appendChild(animateTitle);
    objectPropertiesEle.appendChild(animateContainer);
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

  const downloadEle = document.getElementById('download')
  downloadEle.addEventListener('click', exportSceneToGLB)

  // --- Helper function to trigger file download ---
  function save( blob, filename ) {
    const link = document.createElement( 'a' );
    link.style.display = 'none';
    document.body.appendChild( link ); // Required for Firefox

    link.href = URL.createObjectURL( blob );
    link.download = filename;
    link.click();

    URL.revokeObjectURL( link.href ); // Free up memory
    document.body.removeChild( link ); // Clean up
  }

  function saveArrayBuffer( buffer, filename ) {
    save( new Blob( [ buffer ], { type: 'application/octet-stream' } ), filename );
  }
  // --- End Helper Function ---


  // --- Export Function ---
  function exportSceneToGLB() {
    const exporter = new GLTFExporter();
    const meshesToExport = objectList.map(item => item.mesh);

    // Create a temporary scene for export
    const exportScene = new THREE.Scene();
    exportScene.background = scene.background;

    const carModelClone = carModel.clone();
    
    // Add all meshes to the export scene
    meshesToExport.forEach(mesh => {
      const meshClone = mesh.clone();
      exportScene.add(meshClone);
    });
    exportScene.add(carModelClone)

    // Add light if it exists
    if (directionalLight) {
      const lightClone = directionalLight.clone();
      // Create a target for the light and make it a child
      const target = new THREE.Object3D();
      target.position.set(0, 0, -1);
      lightClone.add(target);
      lightClone.target = target;
      exportScene.add(lightClone);
    }

    // Create a single animation clip that contains all animations
    const duration = 5; // 5 seconds duration for animation
    const times = [0, 0.625, 1.25, 1.875, 2.5, 3.125, 3.75, 4.375, 5]; // Keyframes spread over 5 seconds
    const tracks = [];

    const addTrackByType = (obj) => {
      // Check if mesh has animation properties
      if (obj.userData.animationType) {
        if (obj.userData.animationType === 'Rotate') {
          // Rotation animation - continuous rotation with more steps
          const rotationValues = [
            new THREE.Quaternion().setFromEuler(obj.rotation),
            new THREE.Quaternion().setFromEuler(new THREE.Euler(
              obj.rotation.x,
              obj.rotation.y + Math.PI/4,
              obj.rotation.z
            )),
            new THREE.Quaternion().setFromEuler(new THREE.Euler(
              obj.rotation.x,
              obj.rotation.y + Math.PI/2,
              obj.rotation.z
            )),
            new THREE.Quaternion().setFromEuler(new THREE.Euler(
              obj.rotation.x,
              obj.rotation.y + Math.PI * 0.75,
              obj.rotation.z
            )),
            new THREE.Quaternion().setFromEuler(new THREE.Euler(
              obj.rotation.x,
              obj.rotation.y + Math.PI,
              obj.rotation.z
            )),
            new THREE.Quaternion().setFromEuler(new THREE.Euler(
              obj.rotation.x,
              obj.rotation.y + Math.PI * 1.25,
              obj.rotation.z
            )),
            new THREE.Quaternion().setFromEuler(new THREE.Euler(
              obj.rotation.x,
              obj.rotation.y + Math.PI * 1.5,
              obj.rotation.z
            )),
            new THREE.Quaternion().setFromEuler(new THREE.Euler(
              obj.rotation.x,
              obj.rotation.y + Math.PI * 1.75,
              obj.rotation.z
            )),
            new THREE.Quaternion().setFromEuler(new THREE.Euler(
              obj.rotation.x,
              obj.rotation.y + Math.PI * 2,
              obj.rotation.z
            ))
          ];
          tracks.push(new THREE.QuaternionKeyframeTrack(
            `${obj.name}.quaternion`,
            times,
            rotationValues.map(q => [q.x, q.y, q.z, q.w]).flat()
          ));
        } else if (obj.userData.animationType === 'Balloon') {
          // Position animation (balloon effect) with Vector3
          const originalPosition = obj.position.clone();
          const amplitude = 0.5;
          
          // Create position values for each keyframe
          const positionValues = times.map(t => {
            const progress = t / duration;
            const yOffset = Math.sin(progress * Math.PI * 2) * amplitude;
            return new THREE.Vector3(
              originalPosition.x,
              originalPosition.y + yOffset,
              originalPosition.z
            );
          });

          // Create position track
          tracks.push(new THREE.VectorKeyframeTrack(
            `${obj.name}.position`,
            times,
            positionValues.map(v => [v.x, v.y, v.z]).flat()
          ));
        }
      }
    }

    addTrackByType(carModelClone)

    meshesToExport.forEach((mesh) => {
      addTrackByType(mesh)
    });

    // Create a single animation clip with all tracks
    const animationClip = new THREE.AnimationClip('animations', duration, tracks);
    animationClip.loop = THREE.LoopRepeat;

    // Options for the exporter
    const options = {
      trs: true,
      binary: true,
      embedImages: true,
      animations: [animationClip],
      onlyVisible: false,
      includeCustomExtensions: true
    };

    // Parse the scene
    exporter.parse(
      exportScene,
      function (result) {
        // `result` will be an ArrayBuffer containing the GLB data because `binary: true`
        saveArrayBuffer(result, 'scene.glb');
      },
      function (error) {
        console.error('An error occurred during GLB export:', error);
        alert('Export failed. Check console for details.');
      },
      options
    );
  }
  // --- End Export Function ---

  // --- Helper Function to add item to the UI list ---
  function addObjectToUIList(obj, type = 'mesh') {
    const meshId = obj.uuid;
    const objectListEle = document.querySelector(".object-list");
    const objectEle = document.createElement("div");
    objectEle.classList.add("object-item");
    objectEle.id = meshId;

    objectEle.addEventListener("click", () => {
      if (!objectEle.classList.contains('object-item--selected')) {
        if (type === 'mesh') handleSelectMesh(obj);
        if (type === 'modal') handleSelectModal(obj);
      }
    });

    const objectLogoEle = document.createElement("img");
    objectLogoEle.src = "./boxes.svg";
    objectLogoEle.width = 18;
    objectLogoEle.height = 18;
    objectEle.appendChild(objectLogoEle);

    const objectTitleEle = document.createElement("div");
    objectTitleEle.classList.add("object-item__title");
    objectTitleEle.textContent = obj.name; // Use the mesh name
    objectEle.appendChild(objectTitleEle);

    const objectCopyEle = document.createElement("img");
    objectCopyEle.id = `copy-${obj.uuid}`
    objectCopyEle.src = "./copy.svg";
    objectCopyEle.width = 18;
    objectCopyEle.height = 18;
    objectCopyEle.style.visibility = "hidden"; // Start hidden
    objectEle.appendChild(objectCopyEle);
    objectCopyEle.addEventListener("click", (e) => {
      e.stopPropagation();
      handleCopyMesh(obj);
    });


    const objectTrashEle = document.createElement("img");
    objectTrashEle.id = `trash-${obj.uuid}`
    objectTrashEle.src = "./trash.svg";
    objectTrashEle.width = 18;
    objectTrashEle.height = 18;
    objectTrashEle.style.visibility = "hidden"; // Start hidden
    objectEle.appendChild(objectTrashEle);
    objectTrashEle.addEventListener("click", (e) => {
      e.stopPropagation();
      handleRemoveMesh(obj);
    });

    objectListEle.appendChild(objectEle);
  }
// --- End Helper Function ---

  // --- Helper Function to add mesh to internal list ---
  function addObjectToInternalList(mesh) {
    objectList.push({
        id: mesh.uuid,
        mesh,
    });
}
// --- End Helper Function ---

  // --- Function to handle copying the selected mesh ---
  function handleCopyMesh(mesh) {
    // 1. Clone the mesh
    const clonedMesh = mesh.clone();

    // 2. Clone the material (important for independent appearance)
    if (mesh.material) {
        if (Array.isArray(mesh.material)) {
            clonedMesh.material = mesh.material.map(m => m.clone());
        } else {
            clonedMesh.material = mesh.material.clone();
        }
    }
    // Geometry is typically shared by default by clone(), which is often desired for performance.
    // If independent geometry modification is needed later, uncomment the next line:
    // clonedMesh.geometry = selectedMesh.geometry.clone();

    // 3. Assign a new name
    clonedMesh.name = `${mesh.name} (Copy)`;

    // 4. Offset the position slightly
    const offset = new THREE.Vector3(0.5, 0, 0.5); // Offset diagonally
    clonedMesh.position.add(offset);

    // 5. Add to scene
    scene.add(clonedMesh);

    // 6. Add to internal list and UI list
    addObjectToInternalList(clonedMesh)
    addObjectToUIList(clonedMesh);

    // 7. Select the newly created clone
    handleSelectMesh(clonedMesh); // This will handle deselection of the old one, UI updates, and rendering
  }
  // --- End Copy Function ---

  function handleSelectModal(modal) {
    if (!modal) return;

    handleUnselectOfCurrentSelectedMesh();

    const objectEle = document.getElementById(modal.uuid);
    objectEle.classList.add("object-item--selected");

    /* Add transform control */
    transformControl.attach(modal);
    const gizmo = transformControl.getHelper();
    scene.add(gizmo);
    render();
    /* ===================== */

    renderPropertiesSection(modal, 'modal')
  }
}

main();
