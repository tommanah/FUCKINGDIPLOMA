import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useAppSelector } from '../../store/hooks';

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
            flex-wrap: wrap;
        }
        
        .model-select .buttons-container button {
            padding: 6px 10px;
            border: none;
            border-radius: 5px;
            background: white;
            color: black;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.3s;
            text-align: center;
            min-width: 70px;
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

        .burger-menu-button {
            position: fixed;
            top: 15px;
            left: 15px;
            background: rgba(0, 0, 0, 0.7);
            color: white;
            border: none;
            padding: 10px 15px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 20px;
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
            position: relative;
            background: white;
            color: black;
            border: none;
            padding: 6px 10px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 12px;
            min-width: 70px;
        }
        
        .show-planes-button.active {
            background: #4CAF50;
            color: white;
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
        
        // Добавляем кнопку бургер-меню
        const burgerMenuButton = document.createElement('button');
        burgerMenuButton.className = 'burger-menu-button';
        burgerMenuButton.id = 'burgerMenuButton';
        burgerMenuButton.textContent = '☰';
        uiContainer.appendChild(burgerMenuButton);
        
        // Показываем надпись для демо-пользователя только на странице 3D карты
        const demoNotice = document.createElement('div');
        demoNotice.className = 'demo-restrictions';
        demoNotice.textContent = 'Демо-режим: Ограниченная функциональность.';
        uiContainer.appendChild(demoNotice);
        
        if (isDemoUser) {
          demoNotice.style.display = 'block';
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
        modelSelectContainer.innerHTML = `
          <select id="modelSelect">
              <option value="sunflower">Подсолнух</option>
              <option value="cube">Куб</option>
              <option value="sphere">Сфера</option>
          </select>
          <input type="file" id="fileInput" accept=".glb,.gltf" style="margin-top: 10px; width: 100%;" />
          <div class="buttons-container">
              <button id="placementButton" class="active">📦 Разместить</button>
              <button id="editButton" ${isDemoUser ? 'disabled style="opacity: 0.5;cursor: not-allowed;"' : ''}>✏️ Редактировать</button>
              <button id="showPlanesButton">🔍 Плоскости</button>
          </div>
        `;
        uiContainer.appendChild(modelSelectContainer);

        // Добавляем свет
        const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
        light.position.set(0.5, 1, 0.25);
        scene.add(light);
        
        // Переменная для отслеживания текущего выбранного типа модели
        let selectedModelType = "sunflower";
        
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
        const fileInput = document.getElementById('fileInput');

        if (fileInput) {
          console.log('Найден элемент выбора файла:', fileInput);
          fileInput.addEventListener('change', function(event) {
            console.log('Файл выбран, обрабатываем...');
            const file = event.target.files[0];
            if (!file) {
              console.log('Файл не выбран');
              return;
            }
            
            // Проверяем формат файла
            const isValidFormat = file.name.toLowerCase().endsWith('.glb') || 
                                file.name.toLowerCase().endsWith('.gltf');
            if (!isValidFormat) {
              alert('Пожалуйста, выберите файл формата .glb или .gltf');
              return;
            }
            
            console.log('Выбран файл:', file.name);
            
            // Показываем индикатор загрузки
            const loadingNotification = document.createElement('div');
            loadingNotification.style.position = 'fixed';
            loadingNotification.style.bottom = '100px';
            loadingNotification.style.left = '50%';
            loadingNotification.style.transform = 'translateX(-50%)';
            loadingNotification.style.background = 'rgba(0, 0, 0, 0.7)';
            loadingNotification.style.color = 'white';
            loadingNotification.style.padding = '10px 15px';
            loadingNotification.style.borderRadius = '5px';
            loadingNotification.style.zIndex = '99999';
            loadingNotification.textContent = `Загрузка модели "${file.name}"...`;
            document.body.appendChild(loadingNotification);
            
            interactingWithUI = true;
            setTimeout(() => {
              interactingWithUI = false;
            }, 300);
            
            const reader = new FileReader();
            
            reader.onload = function(e) {
              console.log('Файл прочитан, размер данных:', e.target.result.byteLength);
              const contents = e.target.result;
              
              // Создаем URL из массива
              const blob = new Blob([contents]);
              const url = URL.createObjectURL(blob);
              
              console.log('Создан URL для модели:', url);
              
              // Добавляем модель в список с временным именем
              modelSelect = document.getElementById('modelSelect');
              let userModelOption = document.createElement('option');
              userModelOption.value = 'userModel';
              userModelOption.textContent = `Загрузка модели: ${file.name}...`;
              modelSelect.appendChild(userModelOption);
              modelSelect.value = 'userModel';
              
              // Загружаем пользовательскую модель
              console.log('Загружаем пользовательскую модель...');
              gltfLoader.load(url, 
                function(gltf) {
                  console.log('Модель успешно загружена:', gltf);
                  
                  // Удаляем индикатор загрузки
                  if (loadingNotification.parentNode) {
                    loadingNotification.parentNode.removeChild(loadingNotification);
                  }
                  
                  // Сохраняем загруженную модель
                  loadedModels.userModel = gltf.scene;
                  
                  // Обновляем опцию в селекторе
                  if (userModelOption) {
                    userModelOption.textContent = `Модель: ${file.name}`;
                  }
                  
                  // Выбираем пользовательскую модель
                  if (modelSelect) {
                    modelSelect.value = 'userModel';
                    selectedModelType = 'userModel';
                  }
                  
                  console.log('Пользовательская модель загружена и добавлена:', file.name);
                  URL.revokeObjectURL(url);
                  
                  // Добавляем уведомление о успешной загрузке
                  const notification = document.createElement('div');
                  notification.style.position = 'fixed';
                  notification.style.bottom = '100px';
                  notification.style.left = '50%';
                  notification.style.transform = 'translateX(-50%)';
                  notification.style.background = 'rgba(37, 185, 85, 0.9)';
                  notification.style.color = 'white';
                  notification.style.padding = '10px 15px';
                  notification.style.borderRadius = '5px';
                  notification.style.zIndex = '99999';
                  notification.textContent = `Модель "${file.name}" успешно загружена`;
                  document.body.appendChild(notification);
                  
                  setTimeout(() => {
                    if (notification.parentNode) {
                      notification.parentNode.removeChild(notification);
                    }
                  }, 3000);
                }, 
                function(xhr) {
                  console.log('Прогресс загрузки:', (xhr.loaded / xhr.total * 100) + '%');
                  if (loadingNotification.parentNode) {
                    const progress = Math.round(xhr.loaded / xhr.total * 100);
                    loadingNotification.textContent = `Загрузка модели "${file.name}"... ${progress}%`;
                  }
                },
                function(error) {
                  console.error('Ошибка при загрузке модели:', error);
                  
                  // Удаляем индикатор загрузки
                  if (loadingNotification.parentNode) {
                    loadingNotification.parentNode.removeChild(loadingNotification);
                  }
                  
                  alert('Ошибка при загрузке модели. Проверьте формат файла.');
                  
                  // Удаляем опцию, если произошла ошибка
                  if (userModelOption && userModelOption.parentNode) {
                    userModelOption.parentNode.removeChild(userModelOption);
                  }
                  
                  URL.revokeObjectURL(url);
                }
              );
            };
            
            reader.onerror = function(e) {
              console.error('Ошибка при чтении файла:', e);
              
              // Удаляем индикатор загрузки
              if (loadingNotification.parentNode) {
                loadingNotification.parentNode.removeChild(loadingNotification);
              }
              
              alert('Ошибка при чтении файла.');
            };
            
            console.log('Начинаем чтение файла как ArrayBuffer...');
            reader.readAsArrayBuffer(file);
          });
        }
        
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
          console.log('Создаем статические модели вместо загрузки GLTF');
          
          // Создаем подсолнух
          const sunflowerGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.3, 32);
          const stemMaterial = new THREE.MeshStandardMaterial({ color: 0x008800 });
          const stem = new THREE.Mesh(sunflowerGeometry, stemMaterial);
          
          // Добавляем головку подсолнуха
          const headGeometry = new THREE.SphereGeometry(0.15, 32, 32);
          const headMaterial = new THREE.MeshStandardMaterial({ color: 0xFFD700 });
          const head = new THREE.Mesh(headGeometry, headMaterial);
          head.position.set(0, 0.2, 0);
          
          // Группируем элементы
          const sunflowerModel = new THREE.Group();
          sunflowerModel.add(stem);
          sunflowerModel.add(head);
          
          // Создаем указатель
          const reticleGeometry = new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2);
          const reticleMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x0099ff,
            transparent: true,
            opacity: 0.7
          });
          const reticleModel = new THREE.Mesh(reticleGeometry, reticleMaterial);
          
          // Обновляем наш объект loadedModels вместо создания нового
          loadedModels.sunflower = sunflowerModel;
          loadedModels.reticle = reticleModel;
          
          return loadedModels;
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
              
              switch(selectedModel) {
                case 'sunflower':
                  if (loadedModels.sunflower) {
                    // Используем загруженную GLTF модель или статическую модель
                    mesh = loadedModels.sunflower.clone ? loadedModels.sunflower.clone() : loadedModels.sunflower;
                    
                    // Масштабируем модель до нужного размера
                    if (mesh instanceof THREE.Group) {
                      // Для статической модели (THREE.Group)
                      mesh.scale.set(0.2, 0.2, 0.2);
                    } else {
                      // Для загруженной GLTF модели
                      mesh.scale.set(0.2, 0.2, 0.2);
                    }
                    
                    console.log('Использование модели для подсолнуха:', mesh);
                  } else {
                    // Упрощенный подсолнух, если модель не загрузилась
                    const geometry = new THREE.CylinderGeometry(0.1, 0.1, 0.3, 32);
                    const material = new THREE.MeshStandardMaterial({ color: 0xFFD700 });
                    mesh = new THREE.Mesh(geometry, material);
                  }
                  break;
                
                case 'sphere':
                  // Создаем сферу
                  const sphereGeometry = new THREE.SphereGeometry(0.15, 32, 32);
                  const sphereMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
                  mesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
                  break;
                
                case 'cube':
                  // Создаем куб
                  const cubeGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
                  const cubeMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
                  mesh = new THREE.Mesh(cubeGeometry, cubeMaterial);
                  break;
                
                case 'userModel':
                  // Используем загруженную пользователем модель
                  if (loadedModels.userModel) {
                    console.log('Размещаем пользовательскую модель');
                    
                    // Клонируем модель, чтобы можно было размещать несколько экземпляров
                    mesh = loadedModels.userModel.clone();
                    
                    // Масштабируем модель до разумного размера
                    mesh.scale.set(0.2, 0.2, 0.2);
                  } else {
                    console.warn('Пользовательская модель не найдена, используем запасной вариант');
                    // Если что-то пошло не так, используем куб в качестве запасного варианта
                    const fallbackGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
                    const fallbackMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
                    mesh = new THREE.Mesh(fallbackGeometry, fallbackMaterial);
                  }
                  break;
                
                default:
                  // Создаем простой объект по умолчанию
                  const defaultGeometry = new THREE.BoxGeometry(0.15, 0.15, 0.15);
                  const defaultMaterial = new THREE.MeshStandardMaterial({ color: 0x1E90FF });
                  mesh = new THREE.Mesh(defaultGeometry, defaultMaterial);
                  break;
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
          
          // Обнуляем функцию запуска AR
          startARSessionFunction = null;
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