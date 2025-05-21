import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useAppSelector } from '../../store/hooks';
import './AR.css';
import './notifications.css';

// Глобальная переменная для хранения функции запуска AR
let startARSessionFunction = null;

// Экспортируем функцию для внешнего использования
export function startARSession() {
  if (startARSessionFunction) {
    return startARSessionFunction();
  }
  return false;
}

function AR() {
  const mountRef = useRef(null);
  const token = useAppSelector(state => state.auth.token);
  const userModel = useAppSelector(state => state.auth.userModel);
  const isDemoUser = token === 'demo-token-no-permissions';
  const [arActive, setArActive] = useState(false);

  useEffect(() => {
    if (!mountRef.current) return;

    // Загружаем скрипты для AR
    const loadScripts = async () => {
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
        
        // Добавляем кнопку бургер-меню
        const burgerMenuButton = document.createElement('button');
        burgerMenuButton.className = 'burger-menu-button';
        burgerMenuButton.id = 'burgerMenuButton';
        burgerMenuButton.textContent = '☰';
        uiContainer.appendChild(burgerMenuButton);
        
        if (isDemoUser) {
          // Показываем уведомление для демо-пользователя
          const demoAlert = document.createElement('div');
          demoAlert.className = 'model-error-notification';
          demoAlert.textContent = 'Демо-режим: Ограниченная функциональность.';
          document.body.appendChild(demoAlert);
          
          setTimeout(() => {
            if (demoAlert.parentNode) {
              demoAlert.parentNode.removeChild(demoAlert);
            }
          }, 3000);
        }
        
        // Загружаем модели GLTF
        const gltfLoader = new GLTFLoader();
        
        // Сразу создаем объект для хранения моделей
        const loadedModels = {
          sunflower: null,
          reticle: null,
          userModel: null
        };
        
        // Добавляем селектор моделей
        const modelSelectContainer = document.createElement('div');
        modelSelectContainer.className = 'model-select';
        
        // Проверяем, есть ли загруженная пользователем модель
        const hasUserModel = userModel && userModel.url;
        
        const modelSelectHTML = `
          <select id="modelSelect">
              <option value="sunflower">Подсолнух</option>
              <option value="cube">Куб</option>
              <option value="sphere">Сфера</option>
              ${hasUserModel ? `<option value="userModel">Модель: ${userModel.name}</option>` : ''}
          </select>
          <div class="buttons-container">
              <button id="placementButton" class="active">📦 Разместить</button>
              <button id="editButton" ${isDemoUser ? 'disabled style="opacity: 0.5;cursor: not-allowed;"' : ''}>✏️ Редактировать</button>
              <button id="showPlanesButton">🔍 Плоскости</button>
          </div>
        `;
        
        modelSelectContainer.innerHTML = modelSelectHTML;
        uiContainer.appendChild(modelSelectContainer);

        // Добавляем свет
        const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
        light.position.set(0.5, 1, 0.25);
        scene.add(light);
        
        // Переменная для отслеживания текущего выбранного типа модели
        let selectedModelType = "sunflower";
        
        // Если есть пользовательская модель, загружаем её
        if (hasUserModel) {
          console.log('Загружаем пользовательскую модель из Main:', userModel.name);
          try {
            gltfLoader.load(userModel.url, 
              function(gltf) {
                console.log('Пользовательская модель успешно загружена');
                loadedModels.userModel = gltf.scene;
                
                // Автоматически выбираем пользовательскую модель
                const modelSelect = document.getElementById('modelSelect');
                if (modelSelect) {
                  modelSelect.value = 'userModel';
                  // Обновляем значение выбранной модели
                  selectedModelType = 'userModel';
                }
              },
              function(xhr) {
                console.log('Прогресс загрузки модели из Main:', (xhr.loaded / xhr.total * 100) + '%');
              },
              function(error) {
                console.error('Ошибка при загрузке модели из Main:', error);
              }
            );
          } catch (error) {
            console.error('Ошибка при загрузке пользовательской модели:', error);
          }
        }
        
        // Предотвращаем срабатывание controller select при взаимодействии с UI
        const isUIElement = (element) => {
          // Проверяем, является ли элемент или его родители частью UI
          let currentElement = element;
          while (currentElement) {
            if (currentElement.classList && 
                (currentElement.classList.contains('model-select') || 
                 currentElement.classList.contains('burger-menu-button') ||
                 currentElement.tagName === 'SELECT' || 
                 currentElement.tagName === 'BUTTON' ||
                 currentElement.tagName === 'OPTION')) {
              return true;
            }
            currentElement = currentElement.parentElement;
          }
          return false;
        };
        
        // Глобальный флаг для отслеживания взаимодействия с UI
        let interactingWithUI = false;
        
        // Обработчик событий для всех элементов UI, чтобы предотвратить всплытие событий
        document.body.addEventListener('touchstart', (event) => {
          if (isUIElement(event.target)) {
            interactingWithUI = true;
            console.log('Взаимодействие с UI элементом начато');
            // Останавливаем всплытие события, чтобы предотвратить срабатывание controller select
            event.stopPropagation();
          }
        }, true);
        
        document.body.addEventListener('touchend', (event) => {
          if (isUIElement(event.target)) {
            // Устанавливаем флаг обратно с задержкой, чтобы избежать ложных срабатываний
            setTimeout(() => {
              interactingWithUI = false;
              console.log('Взаимодействие с UI элементом завершено');
            }, 300);
            event.stopPropagation();
          }
        }, true);
        
        document.body.addEventListener('click', (event) => {
          if (isUIElement(event.target)) {
            // Останавливаем всплытие события для клика также
            interactingWithUI = true;
            console.log('Клик по UI элементу');
            event.stopPropagation();
            
            // Устанавливаем флаг обратно с задержкой
            setTimeout(() => {
              interactingWithUI = false;
            }, 300);
          }
        }, true);
        
        // Добавляем обработчик для селектора моделей
        const modelSelect = document.getElementById('modelSelect');

        if (modelSelect) {
          modelSelect.addEventListener('change', (event) => {
            const select = event.target;
            selectedModelType = select.value;
            console.log('Выбран тип модели:', selectedModelType, 'options:', select.options, 'selectedIndex:', select.selectedIndex);
            
            // Дополнительная проверка
            if (select.selectedIndex >= 0 && select.options[select.selectedIndex]) {
              console.log('Выбранная опция:', select.options[select.selectedIndex].value);
            }
            
            event.stopPropagation();
            
            // Устанавливаем флаг взаимодействия с UI
            interactingWithUI = true;
            setTimeout(() => {
              interactingWithUI = false;
            }, 300);
          });
          
          // Устанавливаем обработчик на родительский контейнер для защиты от событий
          const modelSelectContainer = document.querySelector('.model-select');
          if (modelSelectContainer) {
            modelSelectContainer.addEventListener('click', (event) => {
              event.stopPropagation();
              interactingWithUI = true;
              setTimeout(() => {
                interactingWithUI = false;
              }, 300);
            }, true);
            
            modelSelectContainer.addEventListener('touchstart', (event) => {
              event.stopPropagation();
              interactingWithUI = true;
            }, true);
            
            modelSelectContainer.addEventListener('touchend', (event) => {
              event.stopPropagation();
              setTimeout(() => {
                interactingWithUI = false;
              }, 300);
            }, true);
          }
        }
        
        // Создаем статические модели вместо загрузки GLTF
       const createStaticModels = () => {
        console.log('Создаем статические модели');

        // Подсолнух
        const sunflowerGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.3, 32);
        const stemMaterial = new THREE.MeshStandardMaterial({ color: 0x008800 });
        const stem = new THREE.Mesh(sunflowerGeometry, stemMaterial);

        const headGeometry = new THREE.SphereGeometry(0.15, 32, 32);
        const headMaterial = new THREE.MeshStandardMaterial({ color: 0xFFD700 });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.set(0, 0.2, 0);

        const sunflowerModel = new THREE.Group();
        sunflowerModel.add(stem);
        sunflowerModel.add(head);

        // Куб
        const cubeGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
        const cubeMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
        const cubeModel = new THREE.Mesh(cubeGeometry, cubeMaterial);

        // Сфера
        const sphereGeometry = new THREE.SphereGeometry(0.15, 32, 32);
        const sphereMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
        const sphereModel = new THREE.Mesh(sphereGeometry, sphereMaterial);

        // Указатель (ретикл)
        const reticleGeometry = new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2);
        const reticleMaterial = new THREE.MeshBasicMaterial({ color: 0x0099ff, transparent: true, opacity: 0.7 });
        const reticleModel = new THREE.Mesh(reticleGeometry, reticleMaterial);

        loadedModels.sunflower = sunflowerModel;
        loadedModels.cube = cubeModel;
        loadedModels.sphere = sphereModel;
        loadedModels.reticle = reticleModel;
        };

        
        // Сразу создаем статичные модели для использования, пока загружаются GLTF
        createStaticModels();
        
        // Список всех возможных путей для попытки загрузки
        const possiblePaths = [
          { sunflower: '../ar/gltf/sunflower/sunflower.gltf', reticle: '../ar/gltf/reticle/reticle.gltf' },
          { sunflower: 'ar/gltf/sunflower/sunflower.gltf', reticle: 'ar/gltf/reticle/reticle.gltf' },
          { sunflower: '/ar/gltf/sunflower/sunflower.gltf', reticle: '/ar/gltf/reticle/reticle.gltf' },
          { sunflower: '/pages/playground/ar/gltf/sunflower/sunflower.gltf', reticle: '/pages/playground/ar/gltf/reticle/reticle.gltf' },
          { sunflower: './ar/gltf/sunflower/sunflower.gltf', reticle: './ar/gltf/reticle/reticle.gltf' },
          { sunflower: '../../ar/gltf/sunflower/sunflower.gltf', reticle: '../../ar/gltf/reticle/reticle.gltf' }
        ];
        
        // СОЗДАЕМ СТАНДАРТНУЮ КНОПКУ AR ИЗ THREEJS
        const xrButton = ARButton.createButton(renderer, {
          requiredFeatures: ['hit-test'],
          optionalFeatures: ['dom-overlay'],
          domOverlay: { root: document.body }
        });
        xrButton.textContent = 'WebXR Start AR';
        xrButton.id = 'ARButton'; // Устанавливаем ID для программного доступа
        // document.body.appendChild(xrButton);
        
        // Функция для программного запуска AR сессии
        const startARSession = () => {
          console.log('Запускаем AR сессию программно');
          if (xrButton) {
            xrButton.click();
            return true;
          }
          return false;
        };
        
        // Сохраняем функцию запуска в глобальную переменную
        startARSessionFunction = startARSession;
        
        // Получаем кнопку Включить AR из Main.tsx и имитируем нажатие на xrButton
        document.querySelectorAll('button').forEach(button => {
          if (button.textContent.includes('Включить AR')) {
            button.addEventListener('click', () => {
              startARSession();
            });
          }
        });
        
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
        //   stopArButton.style.display = 'block';
          
          // Показываем бургер-меню в режиме AR
          const burgerMenuBtn = document.getElementById('burgerMenuButton');
          if (burgerMenuBtn) {
            burgerMenuBtn.style.display = 'block';
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
          
          controller.addEventListener('select', (event) => {
            // Проверяем, не взаимодействует ли пользователь с UI
            if (interactingWithUI) {
              console.log('Игнорируем событие контроллера, т.к. пользователь взаимодействует с UI');
              return;
            }
            
            const placementButton = document.getElementById('placementButton');
            const editButton = document.getElementById('editButton');
            
            // Режим размещения объектов
            if (placementButton && placementButton.classList.contains('active') && reticle.visible) {
              // Проверяем ограничения для демо-пользователей
              if (isDemoUser && placedObjectsCount >= MAX_DEMO_OBJECTS) {                
                    alert('Лимит достигнут! Зарегистрируйтесь для размещения большего количества объектов.');
                return;
              }
            
              // Получаем текущее значение из селектора
              const modelSelect = document.getElementById('modelSelect');
              let selectedModel = 'cube'; // Значение по умолчанию
              
              if (modelSelect) {
                selectedModel = modelSelect.value;
                // Дополнительная проверка для гарантии, что значение получено корректно
                if (!selectedModel && modelSelect.selectedIndex >= 0 && modelSelect.options[modelSelect.selectedIndex]) {
                  selectedModel = modelSelect.options[modelSelect.selectedIndex].value;
                }
              }
              
              console.log('Создание объекта типа:', selectedModel);
              
              let mesh;

                if (loadedModels[selectedModel]) {
                mesh = loadedModels[selectedModel].clone();
                mesh.scale.set(0.2, 0.2, 0.2);
                console.log(`Используем модель: ${selectedModel}`, mesh);
                } else if (selectedModel === 'userModel') {
                if (loadedModels.userModel) {
                    mesh = loadedModels.userModel.clone();
                    mesh.scale.set(0.2, 0.2, 0.2);
                    console.log('Размещаем пользовательскую модель');
                } else {
                    console.warn('Пользовательская модель не найдена, используем запасной вариант');
                    mesh = new THREE.Mesh(
                    new THREE.BoxGeometry(0.2, 0.2, 0.2),
                    new THREE.MeshStandardMaterial({ color: 0x00ff00 })
                    );
                }
                } else {
                console.warn('Неизвестный тип модели:', selectedModel, '- создаём резервный куб');
                mesh = new THREE.Mesh(
                    new THREE.BoxGeometry(0.15, 0.15, 0.15),
                    new THREE.MeshStandardMaterial({ color: 0x1E90FF })
                );
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
        //   stopArButton.style.display = 'none';
          
          // Скрываем бургер-меню при выходе из AR
          const burgerMenuBtn = document.getElementById('burgerMenuButton');
          if (burgerMenuBtn) {
            burgerMenuBtn.style.display = 'none';
          }
          
          // Показываем уведомление для демо-пользователя при выходе из AR
          if (isDemoUser) {
            const demoAlert = document.createElement('div');
            demoAlert.className = 'model-error-notification';
            demoAlert.textContent = 'Демо-режим: Ограниченная функциональность.';
            document.body.appendChild(demoAlert);
            
            setTimeout(() => {
              if (demoAlert.parentNode) {
                demoAlert.parentNode.removeChild(demoAlert);
              }
            }, 3000);
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
        
        // Добавляем обработчик для кнопки бургер-меню
        const burgerMenuButtonEl = document.getElementById('burgerMenuButton');
        if (burgerMenuButtonEl) {
          burgerMenuButtonEl.addEventListener('click', () => {
            const modelSelectContainer = document.querySelector('.model-select');
            if (modelSelectContainer) {
              // Переключаем видимость меню выбора моделей
              if (modelSelectContainer.style.display === 'none') {
                modelSelectContainer.style.display = 'flex';
              } else {
                modelSelectContainer.style.display = 'none';
              }
            }
          });
        }
        
        // При начальной загрузке скрываем элементы управления AR
        modelSelectContainer.style.display = 'none';
        
        // Скрываем бургер-меню изначально
        const burgerMenuBtn = document.getElementById('burgerMenuButton');
        if (burgerMenuBtn) {
          burgerMenuBtn.style.display = 'none';
        }
        
        // При размонтировании очищаем URL пользовательской модели
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
          
          // Обнуляем функцию запуска AR
          startARSessionFunction = null;
          
          // Очищаем URL пользовательской модели, если он был создан
          if (userModel && userModel.url) {
            try {
              URL.revokeObjectURL(userModel.url);
            } catch (e) {
              console.error('Ошибка при освобождении URL объекта:', e);
            }
          }
        };
      } catch (error) {
        console.error('Ошибка при инициализации AR:', error);
      }
    };

    loadScripts();
  }, [isDemoUser, token, userModel]);

  return (
    <div 
      ref={mountRef} 
      className="ar-container" 
    />
  );
}

export default AR; 