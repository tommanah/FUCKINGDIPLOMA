import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useAppSelector } from '../../store/hooks';

function AR() {
  const mountRef = useRef<HTMLDivElement>(null);
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
        }
        
        .ar-container {
            position: absolute;
            width: 100%;
            height: 100%;
            top: 0;
            left: 0;
            z-index: 200;
        }
        
        .ar-header {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            background: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 15px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            z-index: 99999;
            pointer-events: auto;
        }
        
        .ar-header .title {
            font-size: 18px;
            font-weight: bold;
        }
        
        .close-ar-button {
            background: #f44336;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
            font-size: 16px;
        }
        
        .back-button {
            position: fixed;
            top: 70px;
            right: 10px;
            background: rgba(0, 0, 0, 0.7);
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
            z-index: 99999;
        }
      `;
      document.head.appendChild(style);

      try {
        // Инициализация AR с использованием Three.js и WebXR
        const ARButton = await import('three/examples/jsm/webxr/ARButton.js').then(module => module.ARButton);
        
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
        // Это важно, так как domOverlay должен существовать до запуска XR сессии
        const uiContainer = document.createElement('div');
        uiContainer.className = 'ui-container';
        document.body.appendChild(uiContainer);
        
        // Добавляем верхнюю панель с кнопкой закрытия
        const arHeader = document.createElement('div');
        arHeader.className = 'ar-header';
        arHeader.innerHTML = `
          <div class="title">AR Режим</div>
          <button class="close-ar-button" id="closeArButton">Закрыть AR</button>
        `;
        uiContainer.appendChild(arHeader);
        
        // Добавляем кнопку "Назад"
        const backButton = document.createElement('button');
        backButton.className = 'back-button';
        backButton.id = 'backButton';
        backButton.textContent = '← Назад';
        uiContainer.appendChild(backButton);
        
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
        
        // Если демо-пользователь, показываем ограниченную функциональность
        if (isDemoUser) {
          const demoNotice = document.createElement('div');
          demoNotice.className = 'demo-restrictions';
          demoNotice.textContent = 'Демо-режим: Ограниченная функциональность. Для полного доступа зарегистрируйтесь.';
          uiContainer.appendChild(demoNotice);
        }
        
        // Добавляем свет
        const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
        light.position.set(0.5, 1, 0.25);
        scene.add(light);
        
        // Создаем кнопку для запуска AR
        const xrButton = ARButton.createButton(renderer, {
          requiredFeatures: ['hit-test'],
          optionalFeatures: ['dom-overlay'],
          domOverlay: { root: document.body }  // Используем body как root для overlay
        });
        document.body.appendChild(xrButton);
        
        // Устанавливаем обработчики для отслеживания статуса AR сессии
        renderer.xr.addEventListener('sessionstart', () => {
          console.log('AR session started');
          setArActive(true);
          
          // Убедимся, что UI элементы видны в AR режиме
          arHeader.style.display = 'flex';
          backButton.style.display = 'block';
          modelSelectContainer.style.display = 'flex';
        });
        
        renderer.xr.addEventListener('sessionend', () => {
          console.log('AR session ended');
          setArActive(false);
        });
        
        // Максимальное количество объектов для демо-пользователя
        const MAX_DEMO_OBJECTS = 3;
        let placedObjectsCount = 0;
        
        // Настройка контроллера для размещения объектов
        renderer.xr.addEventListener('sessionstart', async () => {
          const session = renderer.xr.getSession();
          
          if (session) {
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
            
            // Обработка нажатий для размещения объектов
            const controller = renderer.xr.getController(0);
            controller.addEventListener('select', () => {
              if (reticle.visible) {
                // Проверяем ограничения для демо-пользователей
                if (isDemoUser && placedObjectsCount >= MAX_DEMO_OBJECTS) {
                  // Показываем сообщение о превышении лимита
                  const existingNotice = document.querySelector('.demo-restrictions');
                  if (existingNotice) {
                    existingNotice.textContent = 
                      'Лимит достигнут! Зарегистрируйтесь для размещения большего количества объектов.';
                  }
                  return;
                }
              
                // Создаем выбранный объект
                const modelSelect = document.getElementById('modelSelect') as HTMLSelectElement;
                const selectedModel = modelSelect ? modelSelect.value : 'cube';
                
                let geometry;
                if (selectedModel === 'cube') {
                  geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
                } else if (selectedModel === 'sphere') {
                  geometry = new THREE.SphereGeometry(0.15, 32, 32);
                } else {
                  // Подсолнух (упрощенно)
                  geometry = new THREE.CylinderGeometry(0.1, 0.1, 0.3, 32);
                }
                
                const material = new THREE.MeshStandardMaterial({
                  color: selectedModel === 'sunflower' ? 0xFFD700 : 0x1E90FF
                });
                
                const mesh = new THREE.Mesh(geometry, material);
                mesh.position.setFromMatrixPosition(reticle.matrix);
                scene.add(mesh);
                
                placedObjectsCount++;
              }
            });
            
            // Функция для обновления положения указателя
            session.requestAnimationFrame(function onXRFrame(time, frame) {
              if (!frame) return session.requestAnimationFrame(onXRFrame);
              
              const hitTestResults = frame.getHitTestResults(hitTestSource);
              
              if (hitTestResults.length) {
                const hit = hitTestResults[0];
                const referenceSpace = renderer.xr.getReferenceSpace();
                 
                if (referenceSpace) {
                  const pose = hit.getPose(referenceSpace);
                  
                  if (pose) {
                    reticle.visible = true;
                    reticle.matrix.fromArray(pose.transform.matrix);
                  }
                }
              } else {
                reticle.visible = false;
              }
              
              renderer.render(scene, camera);
              session.requestAnimationFrame(onXRFrame);
            });
          }
        });
        
        // Анимация
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
          });
          
          if (!isDemoUser) {
            editButton.addEventListener('click', () => {
              editButton.classList.add('active');
              placementButton.classList.remove('active');
            });
          }
        }
        
        // Добавляем обработчик для кнопки закрытия AR
        const closeArButton = document.getElementById('closeArButton');
        if (closeArButton) {
          closeArButton.addEventListener('click', () => {
            console.log('Trying to end AR session');
            if (renderer.xr.isPresenting) {
              renderer.xr.getSession()?.end();
            }
          });
        }
        
        // Добавляем обработчик для кнопки "Назад"
        const backButtonEl = document.getElementById('backButton');
        if (backButtonEl) {
          backButtonEl.addEventListener('click', () => {
            // Здесь можно добавить логику навигации назад
            console.log('Back button pressed');
            window.history.back();
          });
        }
        
        return () => {
          // Очистка при размонтировании компонента
          window.removeEventListener('resize', handleResize);
          renderer.setAnimationLoop(null);
          if (mountRef.current && renderer.domElement.parentNode === mountRef.current) {
            mountRef.current.removeChild(renderer.domElement);
          }
          if (xrButton && xrButton.parentNode) {
            xrButton.parentNode.removeChild(xrButton);
          }
          if (uiContainer && uiContainer.parentNode) {
            uiContainer.parentNode.removeChild(uiContainer);
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