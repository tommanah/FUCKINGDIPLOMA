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
              <button id="rotateButton">🔄 Вращать</button>
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
        // document.querySelectorAll('button').forEach(button => {
        //   if (button.textContent.includes('Включить AR')) {
        //     button.addEventListener('click', () => {
        //       startARSession();
        //     });
        //   }
        // });
        
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
        
        // Инициализируем переменные для вращения объектов
        let isRotating = false;
        let rotationStartPosition = { x: 0, y: 0 };
        let rotationAxis = 'y'; // по умолчанию вращаем вокруг оси Y
        
        // Добавим переменные для выделения объектов
        let originalMaterials = new Map();
        let highlightedObject = null;
        let contextMenuVisible = false;
        
        // Функция для выделения объекта
        const highlightObject = (object) => {
          if (!object) return;
          
          // Если есть предыдущий выделенный объект, возвращаем его оригинальный материал
          if (highlightedObject && highlightedObject !== object) {
            unhighlightObject(highlightedObject);
          }
          
          // Сохраняем текущее состояние объекта
          if (!originalMaterials.has(object.id)) {
            // Сохраняем все материалы объекта, если это группа
            if (object.type === 'Group') {
              const objectMaterials = new Map();
              object.traverse((child) => {
                if (child.isMesh && child.material) {
                  objectMaterials.set(child.id, child.material.clone());
                }
              });
              originalMaterials.set(object.id, objectMaterials);
              
              // Применяем выделение ко всем мешам в группе
              object.traverse((child) => {
                if (child.isMesh) {
                  const highlightMaterial = child.material.clone();
                  highlightMaterial.emissive = new THREE.Color(0x3333ff);
                  highlightMaterial.emissiveIntensity = 0.5;
                  highlightMaterial.transparent = true;
                  highlightMaterial.opacity = 0.9;
                  child.material = highlightMaterial;
                }
              });
            } else {
              // Для одиночного меша
              originalMaterials.set(object.id, object.material.clone());
              
              // Создаем материал подсветки
              const highlightMaterial = object.material.clone();
              highlightMaterial.emissive = new THREE.Color(0x3333ff);
              highlightMaterial.emissiveIntensity = 0.5;
              highlightMaterial.transparent = true;
              highlightMaterial.opacity = 0.9;
              object.material = highlightMaterial;
            }
          }
          
          // Добавляем анимацию пульсации
          if (!object.userData.pulseAnimation) {
            const initialScale = object.scale.clone();
            const targetScale = initialScale.clone().multiplyScalar(1.1);
            
            let direction = 1;
            let factor = 0;
            
            object.userData.pulseAnimation = setInterval(() => {
              factor += direction * 0.05;
              
              if (factor >= 1) {
                factor = 1;
                direction = -1;
              } else if (factor <= 0) {
                factor = 0;
                direction = 1;
              }
              
              const scaleX = initialScale.x + (targetScale.x - initialScale.x) * factor;
              const scaleY = initialScale.y + (targetScale.y - initialScale.y) * factor;
              const scaleZ = initialScale.z + (targetScale.z - initialScale.z) * factor;
              
              object.scale.set(scaleX, scaleY, scaleZ);
            }, 50);
          }
          
          highlightedObject = object;
          
          // Показываем контекстное меню
          showObjectContextMenu(object);
        };

        // Функция для отмены выделения объекта
        const unhighlightObject = (object) => {
          if (!object) return;
          
          // Останавливаем анимацию пульсации
          if (object.userData.pulseAnimation) {
            clearInterval(object.userData.pulseAnimation);
            delete object.userData.pulseAnimation;
          }
          
          // Возвращаем оригинальные размеры
          if (object.userData.originalScale) {
            object.scale.copy(object.userData.originalScale);
          }
          
          // Возвращаем оригинальные материалы
          if (originalMaterials.has(object.id)) {
            const materials = originalMaterials.get(object.id);
            
            if (materials instanceof Map) {
              // Для группы объектов
              object.traverse((child) => {
                if (child.isMesh && materials.has(child.id)) {
                  child.material = materials.get(child.id);
                }
              });
            } else {
              // Для одиночного меша
              object.material = materials;
            }
            
            originalMaterials.delete(object.id);
          }
          
          if (highlightedObject === object) {
            highlightedObject = null;
          }
          
          // Скрываем контекстное меню
          hideObjectContextMenu();
        };
        
        // Функция для показа контекстного меню
        const showObjectContextMenu = (object) => {
          // Скрываем селектор моделей, когда показываем контекстное меню
          const modelSelectContainer = document.querySelector('.model-select');
          if (modelSelectContainer) {
            modelSelectContainer.style.display = 'none';
          }
          
          // Проверяем, существует ли уже меню
          let contextMenu = document.getElementById('objectContextMenu');
          if (contextMenu) {
            // Если меню уже есть, просто показываем его
            contextMenu.style.display = 'flex';
            contextMenuVisible = true;
            return;
          }
          
          // Создаем контекстное меню
          contextMenu = document.createElement('div');
          contextMenu.id = 'objectContextMenu';
          contextMenu.className = 'object-context-menu';
          
          // Оставляем только кнопки для перемещения и вращения
          const actions = [
            { id: 'moveUp', icon: '⬆️', label: 'Вверх', action: () => moveObject(object, 'up') },
            { id: 'moveDown', icon: '⬇️', label: 'Вниз', action: () => moveObject(object, 'down') },
            { id: 'rotateX', icon: '🔄', label: 'X', action: () => startRotation(object, 'x') },
            { id: 'rotateY', icon: '🔄', label: 'Y', action: () => startRotation(object, 'y') },
            { id: 'rotateZ', icon: '🔄', label: 'Z', action: () => startRotation(object, 'z') },
            { id: 'delete', icon: '🗑️', label: 'Удалить', action: () => deleteObject(object) }
          ];
          
          // Для демо-пользователей ограничиваем действия
          const availableActions = isDemoUser 
            ? actions.filter(a => a.id !== 'duplicate') 
            : actions;
          
          const buttonContainer = document.createElement('div');
          buttonContainer.className = 'context-menu-buttons';
          
          availableActions.forEach(actionInfo => {
            const button = document.createElement('button');
            button.className = 'context-menu-button';
            button.innerHTML = `${actionInfo.icon}<span>${actionInfo.label}</span>`;
            button.addEventListener('click', (e) => {
              e.stopPropagation();
              actionInfo.action();
            });
            buttonContainer.appendChild(button);
          });
          
          contextMenu.appendChild(buttonContainer);
          
          // Добавляем меню в DOM
          document.body.appendChild(contextMenu);
          contextMenuVisible = true;
          
          // Добавляем стили для контекстного меню
          if (!document.getElementById('contextMenuStyles')) {
            const style = document.createElement('style');
            style.id = 'contextMenuStyles';
            style.innerHTML = `
              .object-context-menu {
                position: fixed;
                bottom: 70px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(0, 0, 0, 0.7);
                border-radius: 10px;
                padding: 10px;
                z-index: 1000;
                display: flex;
                flex-direction: column;
                align-items: center;
              }
              .context-menu-buttons {
                display: flex;
                flex-wrap: wrap;
                justify-content: center;
                max-width: 300px;
              }
              .context-menu-button {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                background: rgba(60, 60, 60, 0.8);
                color: white;
                border: none;
                border-radius: 8px;
                margin: 5px;
                padding: 10px;
                min-width: 60px;
                height: 60px;
                font-size: 12px;
                cursor: pointer;
                transition: background 0.2s;
              }
              .context-menu-button:hover {
                background: rgba(80, 80, 80, 0.9);
              }
              .context-menu-button span {
                margin-top: 5px;
                font-size: 10px;
              }
            `;
            document.head.appendChild(style);
          }
        };

        // Функция для скрытия контекстного меню
        const hideObjectContextMenu = () => {
          const contextMenu = document.getElementById('objectContextMenu');
          if (contextMenu) {
            contextMenu.style.display = 'none';
            contextMenuVisible = false;
          }
          
          // Показываем обратно селектор моделей при скрытии контекстного меню
          const modelSelectContainer = document.querySelector('.model-select');
          if (modelSelectContainer) {
            modelSelectContainer.style.display = 'flex';
          }
        };

        // Функция для перемещения объекта
        const moveObject = (object, direction) => {
          if (!object) return;
          
          // Величина перемещения
          const step = 0.05;
          
          switch (direction) {
            case 'up':
              object.position.y += step;
              break;
            case 'down':
              object.position.y -= step;
              break;
            default:
              break;
          }
        };

        // Функция для начала вращения объекта
        const startRotation = (object, axis) => {
          if (!object) return;
          
          // Устанавливаем активную ось вращения
          rotationAxis = axis;
          
          // Активируем режим вращения если нужно
          const rotateButton = document.getElementById('rotateButton');
          if (rotateButton && !rotateButton.classList.contains('active')) {
            rotateButton.click();
          }
        };

        // Функция для дублирования объекта
        const duplicateObject = (object) => {
          if (!object || isDemoUser) return;
          
          // Создаем копию объекта
          const clone = object.clone();
          
          // Смещаем копию немного в сторону
          clone.position.x += 0.1;
          clone.position.z += 0.1;
          
          // Добавляем в сцену
          scene.add(clone);
          placedObjects.push(clone);
          
          // Выделяем новый объект
          if (selectedObject) {
            unhighlightObject(selectedObject);
          }
          selectedObject = clone;
          
          // Сохраняем оригинальный масштаб для использования в анимации
          selectedObject.userData.originalScale = selectedObject.scale.clone();
          
          // Подсвечиваем новый объект
          highlightObject(selectedObject);
        };

        // Функция для удаления объекта
        const deleteObject = (object) => {
          if (!object) return;
          
          // Находим индекс объекта в массиве размещенных объектов
          const index = placedObjects.indexOf(object);
          if (index !== -1) {
            // Удаляем объект из массива
            placedObjects.splice(index, 1);
            
            // Удаляем анимацию
            if (object.userData.pulseAnimation) {
              clearInterval(object.userData.pulseAnimation);
            }
            
            // Удаляем объект из сцены
            scene.remove(object);
            
            // Сбрасываем выделение
            selectedObject = null;
            
            // Скрываем контекстное меню
            hideObjectContextMenu();
          }
        };
        
        // Обработчик касаний для вращения объектов
        renderer.domElement.addEventListener('touchstart', (event) => {
          // Проверяем, не касается ли пользователь контекстного меню
          if (contextMenuVisible) {
            let target = event.target;
            while (target) {
              if (target.id === 'objectContextMenu' || target.classList?.contains('context-menu-button')) {
                return; // Если касание по меню, не обрабатываем его как вращение
              }
              target = target.parentElement;
            }
          }
          
          if (selectedObject && document.getElementById('rotateButton')?.classList.contains('active')) {
            isRotating = true;
            // Запоминаем начальную позицию касания
            rotationStartPosition.x = event.touches[0].clientX;
            rotationStartPosition.y = event.touches[0].clientY;
            // Предотвращаем прокрутку страницы при вращении объекта
            event.preventDefault();
          }
        }, { passive: false });
        
        renderer.domElement.addEventListener('touchmove', (event) => {
          if (isRotating && selectedObject) {
            // Вычисляем смещение от начальной позиции касания
            const deltaX = (event.touches[0].clientX - rotationStartPosition.x) * 0.01;
            const deltaY = (event.touches[0].clientY - rotationStartPosition.y) * 0.01;
            
            // Применяем вращение в зависимости от выбранной оси
            if (rotationAxis === 'y') {
              selectedObject.rotation.y += deltaX;
            } else if (rotationAxis === 'x') {
              selectedObject.rotation.x += deltaY;
            } else if (rotationAxis === 'z') {
              selectedObject.rotation.z += deltaX;
            }
            
            // Обновляем начальную позицию касания
            rotationStartPosition.x = event.touches[0].clientX;
            rotationStartPosition.y = event.touches[0].clientY;
            
            // Предотвращаем прокрутку страницы при вращении объекта
            event.preventDefault();
          }
        }, { passive: false });
        
        renderer.domElement.addEventListener('touchend', (event) => {
          isRotating = false;
        });
        
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
          
          // При инициализации контроллера удалим добавленный ранее дублирующий код
          controller.addEventListener('select', (event) => {
            // Проверяем, не взаимодействует ли пользователь с UI
            if (interactingWithUI) {
              console.log('Игнорируем событие контроллера, т.к. пользователь взаимодействует с UI');
              return;
            }
            
            const placementButton = document.getElementById('placementButton');
            const editButton = document.getElementById('editButton');
            const rotateButton = document.getElementById('rotateButton');
            const deleteButton = document.getElementById('deleteButton');
            
            // Режим размещения объектов
            if (placementButton && placementButton.classList.contains('active') && reticle.visible) {
              // Проверяем ограничения для демо-пользователей
              if (isDemoUser && placedObjects.length >= MAX_DEMO_OBJECTS) {                
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
                mesh.scale.set(0.4, 0.4, 0.4);  // Увеличиваем масштаб всех моделей для лучшей видимости
                console.log(`Используем модель: ${selectedModel}`, mesh);
                } else if (selectedModel === 'userModel') {
                if (loadedModels.userModel) {
                    mesh = loadedModels.userModel.clone();
                    mesh.scale.set(0.5, 0.5, 0.5);  // Увеличиваем масштаб пользовательской модели
                    console.log('Размещаем пользовательскую модель');
                } else {
                    console.warn('Пользовательская модель не найдена, используем запасной вариант');
                    mesh = new THREE.Mesh(
                    new THREE.BoxGeometry(0.3, 0.3, 0.3),  // Увеличиваем размер запасного куба
                    new THREE.MeshStandardMaterial({ color: 0x00ff00 })
                    );
                }
                } else {
                console.warn('Неизвестный тип модели:', selectedModel, '- создаём резервный куб');
                mesh = new THREE.Mesh(
                    new THREE.BoxGeometry(0.3, 0.3, 0.3),  // Увеличиваем размер резервного куба
                    new THREE.MeshStandardMaterial({ color: 0x1E90FF })
                );
                }

              
              // Устанавливаем позицию объекта
              mesh.position.setFromMatrixPosition(reticle.matrix);
              mesh.userData.selectable = true; // Отмечаем объект как доступный для выбора
              
              scene.add(mesh);
              placedObjects.push(mesh);
              placedObjectsCount++;
              
              // Выбираем новый объект и подсвечиваем его
              if (selectedObject) {
                unhighlightObject(selectedObject);
              }
              selectedObject = mesh;
              
              // Сохраняем оригинальный масштаб для использования в анимации
              selectedObject.userData.originalScale = selectedObject.scale.clone();
              
              // Подсвечиваем новый объект
              highlightObject(selectedObject);
            } 
            // Режим редактирования или вращения - выбор объекта
            else if ((editButton && editButton.classList.contains('active') && !isDemoUser) || 
                     (rotateButton && rotateButton.classList.contains('active')) ||
                     (deleteButton && deleteButton.classList.contains('active') && !isDemoUser)) {
              // Проверяем, не выбрали ли мы какой-то объект
              const raycaster = new THREE.Raycaster();
              const tmpVector = new THREE.Vector2(0, 0); // Центр экрана
              
              // Устанавливаем луч из камеры
              raycaster.setFromCamera(tmpVector, camera);
              
              // Получаем все объекты, которые пересекаются с лучом
              const intersects = raycaster.intersectObjects(placedObjects, true);
              
              if (intersects.length > 0) {
                // Находим родительский объект в списке размещенных объектов
                let selected = intersects[0].object;
                let parent = selected;
                
                // Поднимаемся по иерархии, пока не найдем корневой объект из списка placedObjects
                while (parent.parent && !placedObjects.includes(parent)) {
                  parent = parent.parent;
                }
                
                // Если нашли корневой объект в placedObjects, используем его
                if (placedObjects.includes(parent)) {
                  selected = parent;
                }
                
                // Проверяем, находимся ли мы в режиме удаления
                if (deleteButton && deleteButton.classList.contains('active') && !isDemoUser) {
                  // Удаляем выбранный объект
                  deleteObject(selected);
                  
                  // После удаления объекта переключаемся обратно в режим размещения через небольшую задержку
                  setTimeout(() => {
                    deleteButton.classList.remove('active');
                    placementButton.classList.add('active');
                  }, 300);
                  
                  return;
                }
                
                // Если ранее был выбран другой объект, снимаем выделение
                if (selectedObject && selectedObject !== selected) {
                  unhighlightObject(selectedObject);
                }
                
                // Выбираем новый объект и подсвечиваем его
                selectedObject = selected;
                highlightObject(selectedObject);
                
                // Сохраняем оригинальный масштаб для использования в анимации
                if (!selectedObject.userData.originalScale) {
                  selectedObject.userData.originalScale = selectedObject.scale.clone();
                }
              } else {
                // Если клик по пустому месту, снимаем выделение
                if (selectedObject) {
                  unhighlightObject(selectedObject);
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
            
            // Если есть выбранный объект и мы в соответствующем режиме
            if (selectedObject) {
              if (editButton && editButton.classList.contains('active') && !isDemoUser) {
                // Обработка перемещения объекта
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
              // Для режима вращения не требуется проверка на демо-пользователя
              // Основное вращение уже обрабатывается через события touchmove
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
          
          // Очищаем выделение объектов
          if (selectedObject) {
            unhighlightObject(selectedObject);
          }
          selectedObject = null;
          
          // Показываем кнопку ARButton и скрываем элементы управления
          xrButton.style.display = 'block';
          modelSelectContainer.style.display = 'none';
        //   stopArButton.style.display = 'none';
          
          // Скрываем бургер-меню при выходе из AR
          const burgerMenuBtn = document.getElementById('burgerMenuButton');
          if (burgerMenuBtn) {
            burgerMenuBtn.style.display = 'none';
          }
          
          // Удаляем селектор осей, если он существует
          const axisSelector = document.getElementById('axisSelector');
          if (axisSelector) {
            axisSelector.style.display = 'none';
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
          
          // Сбрасываем выбранный объект и состояние вращения
          selectedObject = null;
          isRotating = false;
          
          // Очищаем сцену от размещенных объектов
          placedObjects.forEach(obj => {
            // Очищаем анимации и интервалы
            if (obj.userData.pulseAnimation) {
              clearInterval(obj.userData.pulseAnimation);
            }
            scene.remove(obj);
          });
          placedObjects.length = 0;
          
          // Очищаем сохраненные материалы
          originalMaterials.clear();
          
          // Удаляем контекстное меню
          const contextMenu = document.getElementById('objectContextMenu');
          if (contextMenu && contextMenu.parentNode) {
            contextMenu.parentNode.removeChild(contextMenu);
          }
          contextMenuVisible = false;
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
        const rotateButton = document.getElementById('rotateButton');
        const deleteButton = document.getElementById('deleteButton');
        
        if (placementButton && editButton && rotateButton) {
          placementButton.addEventListener('click', () => {
            placementButton.classList.add('active');
            editButton.classList.remove('active');
            if (rotateButton) rotateButton.classList.remove('active');
            if (deleteButton) deleteButton.classList.remove('active');
            
            // Скрываем селектор осей при выходе из режима вращения
            const axisSelector = document.getElementById('axisSelector');
            if (axisSelector) {
              axisSelector.style.display = 'none';
            }
            
            // Сбрасываем выбор объекта при переключении в режим размещения
            if (selectedObject) {
              unhighlightObject(selectedObject);
              selectedObject = null;
            }
          });
          
          if (!isDemoUser) {
            editButton.addEventListener('click', () => {
              editButton.classList.add('active');
              placementButton.classList.remove('active');
              if (rotateButton) rotateButton.classList.remove('active');
              if (deleteButton) deleteButton.classList.remove('active');
              
              // Скрываем селектор осей при выходе из режима вращения
              const axisSelector = document.getElementById('axisSelector');
              if (axisSelector) {
                axisSelector.style.display = 'none';
              }
            });
            
            // Обновляем обработчики кнопок режимов
            rotateButton.addEventListener('click', () => {
              rotateButton.classList.add('active');
              placementButton.classList.remove('active');
              if (!isDemoUser) editButton.classList.remove('active');
              if (deleteButton) deleteButton.classList.remove('active');
              
              // Создаем элементы UI для выбора оси вращения, если их еще нет
              let axisSelector = document.getElementById('axisSelector');
              if (!axisSelector) {
                axisSelector = document.createElement('div');
                axisSelector.id = 'axisSelector';
                axisSelector.className = 'axis-selector';
                axisSelector.innerHTML = `
                  <span>Ось вращения:</span>
                  <button data-axis="x" ${rotationAxis === 'x' ? 'class="active"' : ''}>X</button>
                  <button data-axis="y" ${rotationAxis === 'y' ? 'class="active"' : ''}>Y</button>
                  <button data-axis="z" ${rotationAxis === 'z' ? 'class="active"' : ''}>Z</button>
                `;
                modelSelectContainer.appendChild(axisSelector);
                
                // Добавляем обработчики для кнопок выбора оси
                const axisButtons = axisSelector.querySelectorAll('button');
                axisButtons.forEach(button => {
                  button.addEventListener('click', (e) => {
                    // Убираем активный класс со всех кнопок
                    axisButtons.forEach(btn => btn.classList.remove('active'));
                    // Добавляем активный класс на нажатую кнопку
                    e.target.classList.add('active');
                    // Устанавливаем новую ось вращения
                    rotationAxis = e.target.dataset.axis;
                    // Предотвращаем всплытие событий
                    e.stopPropagation();
                  });
                });
              } else {
                axisSelector.style.display = 'flex';
              }
            });
            
            // Добавляем обработчик для кнопки удаления
            if (deleteButton) {
              deleteButton.addEventListener('click', () => {
                deleteButton.classList.add('active');
                placementButton.classList.remove('active');
                if (!isDemoUser) editButton.classList.remove('active');
                rotateButton.classList.remove('active');
                
                // Скрываем селектор осей при выходе из режима вращения
                const axisSelector = document.getElementById('axisSelector');
                if (axisSelector) {
                  axisSelector.style.display = 'none';
                }
                
                // Если есть выбранный объект, удаляем его
                if (selectedObject) {
                  deleteObject(selectedObject);
                  selectedObject = null;
                } else {
                  // Если нет выбранного объекта, показываем сообщение
                  const notification = document.createElement('div');
                  notification.className = 'model-error-notification';
                  notification.textContent = 'Сначала выберите объект для удаления';
                  document.body.appendChild(notification);
                  
                  setTimeout(() => {
                    if (notification.parentNode) {
                      notification.parentNode.removeChild(notification);
                    }
                  }, 3000);
                }
                
                // Переключаемся обратно в режим размещения после удаления
                setTimeout(() => {
                  deleteButton.classList.remove('active');
                  placementButton.classList.add('active');
                }, 300);
              });
            }
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