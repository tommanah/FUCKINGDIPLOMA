import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useAppSelector } from '../../store/hooks';

function AR() {
  const mountRef = useRef<HTMLDivElement>(null);
  const token = useAppSelector(state => state.auth.token);
  const isDemoUser = token === 'demo-token-no-permissions';

  useEffect(() => {
    if (!mountRef.current) return;

    // Загружаем скрипты для AR
    const loadScripts = async () => {
      // Добавляем стили для AR
      const style = document.createElement('style');
      style.textContent = `
        .model-select {
          position: fixed;
          top: 60px;
          left: 10px;
          z-index: 2000;
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
            z-index: 1000;
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
      `;
      document.head.appendChild(style);

      // Загружаем необходимые скрипты для AR
      // Создаем элементы для AR
      const uiContainer = document.createElement('div');
      uiContainer.className = 'ui-container';
      
      // Если демо-пользователь, показываем ограниченную функциональность
      if (isDemoUser) {
        const demoNotice = document.createElement('div');
        demoNotice.className = 'demo-restrictions';
        demoNotice.textContent = 'Демо-режим: Ограниченная функциональность. Для полного доступа зарегистрируйтесь.';
        uiContainer.appendChild(demoNotice);
      }
      
      uiContainer.innerHTML += `
        <div class="model-select">
            <select id="modelSelect">
                <option value="sunflower">Подсолнух</option>
                <option value="cube">Куб</option>
                <option value="sphere">Сфера</option>
            </select>
            <div class="buttons-container">
                <button id="placementButton" class="active">📦 Разместить</button>
                <button id="editButton" ${isDemoUser ? 'disabled style="opacity: 0.5;cursor: not-allowed;"' : ''}>✏️ Редактировать</button>
            </div>
        </div>
      `;
       
      if (mountRef.current) {
        mountRef.current.appendChild(uiContainer);
      }

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
        
        // Добавляем свет
        const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
        light.position.set(0.5, 1, 0.25);
        scene.add(light);
        
        // Создаем кнопку для запуска AR
        const xrButton = ARButton.createButton(renderer, {
          requiredFeatures: ['hit-test'],
          optionalFeatures: ['dom-overlay'],
          domOverlay: { root: uiContainer }
        });
        document.body.appendChild(xrButton);
        
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
        
        return () => {
          // Очистка при размонтировании компонента
          window.removeEventListener('resize', handleResize);
          renderer.setAnimationLoop(null);
          if (mountRef.current) {
            mountRef.current.removeChild(renderer.domElement);
          }
          if (xrButton) {
            document.body.removeChild(xrButton);
          }
          document.head.removeChild(style);
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
      style={{ 
        width: '100%', 
        height: '100vh',
        position: 'absolute',
        top: 0,
        left: 0,
        zIndex: 200
      }} 
    />
  );
}

export default AR; 