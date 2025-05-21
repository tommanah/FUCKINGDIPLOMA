import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useAppSelector } from '../../store/hooks';

function AR() {
  const mountRef = useRef(null);
  const token = useAppSelector(state => state.auth.token);
  const isDemoUser = token === 'demo-token-no-permissions';
  const [arActive, setArActive] = useState(false);

  useEffect(() => {
    if (!mountRef.current) return;

    // Загружаем скрипты для AR
    const loadScripts = async () => {
      // Создаем и добавляем стили для AR
      const style = document.createElement('style');
      style.textContent = `
        .model-select {
          position: fixed;
          top: 60px;
          left: 10px;
          z-index: 9000;
          background: rgba(0, 0, 0, 0.7);
          padding: 15px;
          border-radius: 10px;
          pointer-events: auto;
          display: flex;
          flex-direction: column;
          gap: 10px;
          min-width: 200px;
        }
        
        .model-select select {
            padding: 8px;
            border-radius: 5px;
            border: none;
            background: white;
            font-size: 14px;
            width: 100%;
        }
        
        .model-select .buttons-container {
            display: flex;
            gap: 10px;
            justify-content: center;
            margin-top: 5px;
        }
        
        .model-select .buttons-container button {
            padding: 8px 16px;
            border: none;
            border-radius: 5px;
            background: white;
            color: black;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.3s;
            flex: 1;
            text-align: center;
        }
        
        .model-select .buttons-container button.active {
            background: #4CAF50;
            color: white;
        }
        
        .ui-container {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 9000;
        }
        
        .ui-container > * {
            pointer-events: auto;
        }
        
        #ARButton {
            position: fixed !important;
            bottom: 20px !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            padding: 12px 24px !important;
            border: 1px solid #fff !important;
            border-radius: 4px !important;
            background: rgba(0, 0, 0, 0.8) !important;
            color: #fff !important;
            font: 13px sans-serif !important;
            text-align: center !important;
            outline: none !important;
            z-index: 999999 !important;
            cursor: pointer !important;
        }
        
        .demo-restrictions {
            position: fixed;
            bottom: 70px;
            left: 50%;
            transform: translateX(-50%);
            background-color: rgba(255, 87, 34, 0.9);
            color: white;
            padding: 10px 15px;
            border-radius: 5px;
            font-size: 14px;
            z-index: 9999;
            text-align: center;
            max-width: 90%;
            display: none;
        }
        
        .ar-container {
            position: absolute;
            width: 100%;
            height: 100%;
            top: 0;
            left: 0;
            z-index: 200;
        }
        
        .back-button {
            position: fixed;
            top: 15px;
            right: 15px;
            background: rgba(0, 0, 0, 0.7);
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
            z-index: 99999;
        }

        .stop-ar-button {
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #f44336;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
            font-size: 16px;
            z-index: 99999;
        }
        
        .show-planes-button {
            position: fixed;
            bottom: 75px;
            right: 20px;
            background: rgba(0, 0, 0, 0.7);
            color: white;
            border: none;
            padding: 10px 15px;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
            z-index: 99999;
        }
        
        .show-planes-button.active {
            background: #4CAF50;
        }
      `;
      document.head.appendChild(style);

      try {
        // Инициализация AR с использованием Three.js и WebXR
        const ARButton = await import('three/examples/jsm/webxr/ARButton.js').then(module => module.ARButton);
        const GLTFLoader = await import('three/examples/jsm/loaders/GLTFLoader.js').then(module => module.GLTFLoader);
        
        // Создаем сцену, камеру и рендерер
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);
        
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.xr.enabled = true;
         
        if (mountRef.current) {
          mountRef.current.appendChild(renderer.domElement);
        }
        
        // Создаем домашний оверлей перед созданием AR сессии
        const uiContainer = document.createElement('div');
        uiContainer.className = 'ui-container';
        document.body.appendChild(uiContainer);
        
        // Показываем надпись для демо-пользователя только на странице 3D карты
        const demoNotice = document.createElement('div');
        demoNotice.className = 'demo-restrictions';
        demoNotice.textContent = 'Демо-режим: Ограниченная функциональность.';
        uiContainer.appendChild(demoNotice);
        
        if (isDemoUser) {
          demoNotice.style.display = 'block';
        }
        
        // Добавляем селектор моделей
        const modelSelectContainer = document.createElement('div');
        modelSelectContainer.className = 'model-select';
        modelSelectContainer.innerHTML = `
          <select id="modelSelect">
              <option value="sunflower">Подсолнух</option>
              <option value="cube">Куб</option>
              <option value="sphere">Сфера</option>
          </select>
          <div class="buttons-container">
              <button id="placementButton" class="active">📦 Разместить</button>
              <button id="editButton" ${isDemoUser ? 'disabled style="opacity: 0.5;cursor: not-allowed;"' : ''}>✏️ Редактировать</button>
          </div>
        `;
        uiContainer.appendChild(modelSelectContainer);
        
        // Добавляем кнопку показа плоскостей
        const showPlanesButton = document.createElement('button');
        showPlanesButton.className = 'show-planes-button';
        showPlanesButton.id = 'showPlanesButton';
        showPlanesButton.textContent = '🔍 Показать плоскости';
        uiContainer.appendChild(showPlanesButton);
        
        // Добавляем кнопку остановки AR
        const stopArButton = document.createElement('button');
        stopArButton.className = 'stop-ar-button';
        stopArButton.id = 'stopArButton';
        stopArButton.textContent = 'Остановить AR';
        stopArButton.style.display = 'none';
        uiContainer.appendChild(stopArButton);
        
        // Добавляем свет
        const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
        light.position.set(0.5, 1, 0.25);
        scene.add(light);
        
        // Загружаем модели GLTF
        const gltfLoader = new GLTFLoader();
        const modelPaths = {
          sunflower: '/pages/playground/ar/gltf/sunflower/sunflower.gltf',
          reticle: '/pages/playground/ar/gltf/reticle/reticle.gltf'
        };
        
        const loadedModels = {};
        
        // Функция для загрузки моделей
        const loadModel = (name, path) => {
          return new Promise((resolve, reject) => {
            gltfLoader.load(
              path,
              (gltf) => {
                loadedModels[name] = gltf.scene;
                resolve(gltf.scene);
              },
              undefined,
              (error) => {
                console.error(`Ошибка при загрузке модели ${name}:`, error);
                reject(error);
              }
            );
          });
        };
        
        // Загружаем модели
        try {
          await Promise.all([
            loadModel('sunflower', modelPaths.sunflower),
            loadModel('reticle', modelPaths.reticle)
          ]);
          console.log('Модели загружены успешно:', loadedModels);
        } catch (error) {
          console.error('Ошибка при загрузке моделей:', error);
        }
        
        // СОЗДАЕМ СТАНДАРТНУЮ КНОПКУ AR ИЗ THREEJS
        const xrButton = ARButton.createButton(renderer, {
          requiredFeatures: ['hit-test'],
          optionalFeatures: ['dom-overlay'],
          domOverlay: { root: document.body }
        });
        document.body.appendChild(xrButton);
        
        // Массив для хранения размещенных объектов
        const placedObjects = [];
        
        // Хранение выбранного объекта
        let selectedObject = null;
        
        // Переменная для хранения объектов плоскостей
        const planes = {
          meshes: new Map(),
          materials: {
            floor: new THREE.MeshBasicMaterial({ 
              color: 0x4488ff, 
              transparent: true, 
              opacity: 0.2,
              side: THREE.DoubleSide 
            }),
            wall: new THREE.MeshBasicMaterial({ 
              color: 0xff8844, 
              transparent: true, 
              opacity: 0.2,
              side: THREE.DoubleSide 
            }),
            ceiling: new THREE.MeshBasicMaterial({ 
              color: 0x44ff88, 
              transparent: true, 
              opacity: 0.2,
              side: THREE.DoubleSide 
            }),
            other: new THREE.MeshBasicMaterial({ 
              color: 0xffffff, 
              transparent: true, 
              opacity: 0.2,
              side: THREE.DoubleSide 
            })
          },
          active: false
        };
        
        // Устанавливаем обработчики для отслеживания статуса AR сессии
        renderer.xr.addEventListener('sessionstart', () => {
          console.log('AR session started');
          setArActive(true);
          
          // Скрываем кнопку ARButton и показываем элементы управления
          xrButton.style.display = 'none';
          modelSelectContainer.style.display = 'flex';
          stopArButton.style.display = 'block';
          showPlanesButton.style.display = 'block';
          
          // Скрываем надпись для демо-пользователя в режиме AR
          if (demoNotice) {
            demoNotice.style.display = 'none';
          }
          
          // Настраиваем hit-test для текущей сессии
          const session = renderer.xr.getSession();
          if (session) {
            setupHitTest(session);
            
            // Добавляем обработчик для плоскостей, если поддерживается
            if ('requestPlaneDetection' in session) {
              session.requestPlaneDetection();
              session.addEventListener('planedetected', (event) => {
                const plane = event.plane;
                handlePlaneDetected(plane);
              });
            }
          }
        });
        
        // Функция для обработки обнаруженных плоскостей
        const handlePlaneDetected = (plane) => {
          if (!planes.active) return;
          
          const geometry = new THREE.PlaneGeometry(1, 1);
          let material;
          
          // Определяем тип плоскости и выбираем соответствующий материал
          switch(plane.orientation) {
            case 'horizontal' && plane.normal.y > 0:
              material = planes.materials.floor;
              break;
            case 'horizontal' && plane.normal.y < 0:
              material = planes.materials.ceiling;
              break;
            case 'vertical':
              material = planes.materials.wall;
              break;
            default:
              material = planes.materials.other;
          }
          
          const mesh = new THREE.Mesh(geometry, material);
          planes.meshes.set(plane.id, mesh);
          scene.add(mesh);
          
          // Обновляем положение и размер плоскости
          plane.addEventListener('update', () => {
            const mesh = planes.meshes.get(plane.id);
            if (mesh) {
              // Обновляем размер
              mesh.scale.set(plane.extent.width, plane.extent.height, 1);
              
              // Обновляем позицию и ориентацию
              const matrix = new THREE.Matrix4();
              matrix.fromArray(plane.transform.matrix);
              mesh.position.setFromMatrixPosition(matrix);
              mesh.quaternion.setFromRotationMatrix(matrix);
            }
          });
        };
        
        // Настройка hit-test
        const setupHitTest = async (session) => {
          const viewerSpace = await session.requestReferenceSpace('viewer');
          const hitTestSource = await session.requestHitTestSource?.({ space: viewerSpace });
           
          if (!hitTestSource) {
            console.error('Не удалось создать источник hit-test');
            return;
          }
          
          // Создаем указатель для размещения объектов
          const reticleGeometry = new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2);
          const reticleMaterial = new THREE.MeshBasicMaterial();
          const reticle = new THREE.Mesh(reticleGeometry, reticleMaterial);
          reticle.matrixAutoUpdate = false;
          reticle.visible = false;
          scene.add(reticle);
          
          // Максимальное количество объектов для демо-пользователя
          const MAX_DEMO_OBJECTS = 3;
          let placedObjectsCount = 0;
          
          // Обработка нажатий для размещения объектов
          const controller = renderer.xr.getController(0);
          
          controller.addEventListener('select', () => {
            const placementButton = document.getElementById('placementButton');
            const editButton = document.getElementById('editButton');
            
            // Режим размещения объектов
            if (placementButton && placementButton.classList.contains('active') && reticle.visible) {
              // Проверяем ограничения для демо-пользователей
              if (isDemoUser && placedObjectsCount >= MAX_DEMO_OBJECTS) {
                // Показываем сообщение о превышении лимита
                const existingNotice = document.querySelector('.demo-restrictions');
                if (existingNotice) {
                  existingNotice.style.display = 'block';
                  existingNotice.textContent = 
                    'Лимит достигнут! Зарегистрируйтесь для размещения большего количества объектов.';
                  
                  // Скрываем сообщение через 3 секунды
                  setTimeout(() => {
                    existingNotice.style.display = 'none';
                  }, 3000);
                }
                return;
              }
            
              // Создаем выбранный объект
              const modelSelect = document.getElementById('modelSelect');
              const selectedModel = modelSelect ? modelSelect.value : 'cube';
              
              let mesh;
              
              if (selectedModel === 'sunflower' && loadedModels.sunflower) {
                // Используем загруженную GLTF модель
                mesh = loadedModels.sunflower.clone();
                // Масштабируем модель до нужного размера
                mesh.scale.set(0.2, 0.2, 0.2);
              } else {
                // Создаем простые геометрические фигуры
                let geometry;
                if (selectedModel === 'cube') {
                  geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
                } else if (selectedModel === 'sphere') {
                  geometry = new THREE.SphereGeometry(0.15, 32, 32);
                } else {
                  // Упрощенный подсолнух, если модель не загрузилась
                  geometry = new THREE.CylinderGeometry(0.1, 0.1, 0.3, 32);
                }
                
                const material = new THREE.MeshStandardMaterial({
                  color: selectedModel === 'sunflower' ? 0xFFD700 : 0x1E90FF
                });
                
                mesh = new THREE.Mesh(geometry, material);
              }
              
              // Устанавливаем позицию объекта
              mesh.position.setFromMatrixPosition(reticle.matrix);
              mesh.userData.selectable = true; // Отмечаем объект как доступный для выбора
              
              scene.add(mesh);
              placedObjects.push(mesh);
              placedObjectsCount++;
            } 
            // Режим редактирования - выбор объекта
            else if (editButton && editButton.classList.contains('active') && !isDemoUser) {
              // Проверяем, не выбрали ли мы какой-то объект
              const raycaster = new THREE.Raycaster();
              const tmpVector = new THREE.Vector2(0, 0); // Центр экрана
              
              // Устанавливаем луч из камеры
              raycaster.setFromCamera(tmpVector, camera);
              
              // Получаем все объекты, которые пересекаются с лучом
              const intersects = raycaster.intersectObjects(placedObjects, true);
              
              if (intersects.length > 0) {
                // Если что-то выбрали
                const selected = intersects[0].object;
                
                // Если ранее был выбранный объект, убираем подсветку
                if (selectedObject) {
                  // Восстанавливаем оригинальный материал
                  if (selectedObject.material.originalColor) {
                    selectedObject.material.color.setHex(selectedObject.material.originalColor);
                  }
                }
                
                // Выбираем новый объект
                selectedObject = selected;
                
                // Запоминаем оригинальный цвет и подсвечиваем
                if (selectedObject.material) {
                  selectedObject.material.originalColor = selectedObject.material.color.getHex();
                  selectedObject.material.color.setHex(0xff0000); // Красная подсветка
                }
              } else {
                // Если клик по пустому месту, снимаем выделение
                if (selectedObject) {
                  if (selectedObject.material && selectedObject.material.originalColor) {
                    selectedObject.material.color.setHex(selectedObject.material.originalColor);
                  }
                  selectedObject = null;
                }
              }
            }
          });
          
          // Функция для обновления положения указателя
          const onXRFrame = (time, frame) => {
            if (!frame) return session.requestAnimationFrame(onXRFrame);
            
            // Получаем результаты hit-test
            const hitTestResults = frame.getHitTestResults(hitTestSource);
            
            if (hitTestResults.length) {
              const hit = hitTestResults[0];
              const referenceSpace = renderer.xr.getReferenceSpace();
               
              if (referenceSpace) {
                const pose = hit.getPose(referenceSpace);
                
                if (pose) {
                  // Показываем указатель только в режиме размещения
                  const placementButton = document.getElementById('placementButton');
                  if (placementButton && placementButton.classList.contains('active')) {
                    reticle.visible = true;
                    reticle.matrix.fromArray(pose.transform.matrix);
                  } else {
                    reticle.visible = false;
                  }
                }
              }
            } else {
              reticle.visible = false;
            }
            
            // Обновляем визуализацию плоскостей, если включено
            if (planes.active && planes.meshes.size > 0) {
              planes.meshes.forEach((mesh) => {
                mesh.visible = true;
              });
            } else {
              planes.meshes.forEach((mesh) => {
                mesh.visible = false;
              });
            }
            
            // Если есть выбранный объект и мы в режиме редактирования, обработка перемещения
            const editButton = document.getElementById('editButton');
            if (selectedObject && editButton && editButton.classList.contains('active') && !isDemoUser) {
              // Здесь можно добавить обработку перемещения объекта
              // Например, привязывать его к результатам hit-test или к позиции контроллера
              if (hitTestResults.length > 0) {
                const hit = hitTestResults[0];
                const referenceSpace = renderer.xr.getReferenceSpace();
                if (referenceSpace) {
                  const pose = hit.getPose(referenceSpace);
                  if (pose) {
                    // Обновляем позицию выбранного объекта
                    selectedObject.position.set(
                      pose.transform.position.x,
                      pose.transform.position.y,
                      pose.transform.position.z
                    );
                  }
                }
              }
            }
            
            renderer.render(scene, camera);
            session.requestAnimationFrame(onXRFrame);
          };
          
          session.requestAnimationFrame(onXRFrame);
        };
        
        // Устанавливаем обработчик для окончания сессии
        renderer.xr.addEventListener('sessionend', () => {
          console.log('AR session ended');
          setArActive(false);
          
          // Показываем кнопку ARButton и скрываем элементы управления
          xrButton.style.display = 'block';
          modelSelectContainer.style.display = 'none';
          stopArButton.style.display = 'none';
          showPlanesButton.style.display = 'none';
          
          // Показываем надпись для демо-пользователя снова на странице карты
          if (isDemoUser && demoNotice) {
            demoNotice.style.display = 'block';
          }
          
          // Сбрасываем выбранный объект
          selectedObject = null;
          
          // Очищаем сцену от размещенных объектов
          placedObjects.forEach(obj => scene.remove(obj));
          placedObjects.length = 0;
        });
        
        // Анимация для 3D карты (не AR режим)
        const animate = () => {
          renderer.setAnimationLoop((time, frame) => {
            if (!frame) {
              renderer.render(scene, camera);
            }
          });
        };
        animate();
        
        // Обработка изменения размера окна
        const handleResize = () => {
          camera.aspect = window.innerWidth / window.innerHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener('resize', handleResize);
        
        // Настройка кнопок управления
        const placementButton = document.getElementById('placementButton');
        const editButton = document.getElementById('editButton');
        
        if (placementButton && editButton) {
          placementButton.addEventListener('click', () => {
            placementButton.classList.add('active');
            editButton.classList.remove('active');
            
            // Сбрасываем выбор объекта при переключении в режим размещения
            if (selectedObject) {
              if (selectedObject.material && selectedObject.material.originalColor) {
                selectedObject.material.color.setHex(selectedObject.material.originalColor);
              }
              selectedObject = null;
            }
          });
          
          if (!isDemoUser) {
            editButton.addEventListener('click', () => {
              editButton.classList.add('active');
              placementButton.classList.remove('active');
            });
          }
        }
        
        // Добавляем обработчик для кнопки показа плоскостей
        const showPlanesButtonEl = document.getElementById('showPlanesButton');
        if (showPlanesButtonEl) {
          showPlanesButtonEl.addEventListener('click', () => {
            planes.active = !planes.active;
            if (planes.active) {
              showPlanesButtonEl.classList.add('active');
            } else {
              showPlanesButtonEl.classList.remove('active');
            }
          });
        }
        
        // Добавляем обработчик для кнопки остановки AR
        const stopArButtonEl = document.getElementById('stopArButton');
        if (stopArButtonEl) {
          stopArButtonEl.addEventListener('click', () => {
            if (renderer.xr.isPresenting) {
              renderer.xr.getSession()?.end();
            }
          });
        }
        
        // При начальной загрузке скрываем элементы управления AR
        modelSelectContainer.style.display = 'none';
        showPlanesButton.style.display = 'none';
        
        return () => {
          // Очистка при размонтировании компонента
          window.removeEventListener('resize', handleResize);
          renderer.setAnimationLoop(null);
          if (mountRef.current && renderer.domElement.parentNode === mountRef.current) {
            mountRef.current.removeChild(renderer.domElement);
          }
          
          // Удаляем все созданные элементы
          if (uiContainer && uiContainer.parentNode) {
            uiContainer.parentNode.removeChild(uiContainer);
          }
          if (xrButton && xrButton.parentNode) {
            xrButton.parentNode.removeChild(xrButton);
          }
          if (style && style.parentNode) {
            style.parentNode.removeChild(style);
          }
        };
      } catch (error) {
        console.error('Ошибка при инициализации AR:', error);
      }
    };

    loadScripts();
  }, [isDemoUser, token]);

  return (
    <div 
      ref={mountRef} 
      className="ar-container" 
    />
  );
}

export default AR; 