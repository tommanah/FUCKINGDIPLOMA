import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls';
import { useAppSelector } from '../../store/hooks';
import './Map.css';
import './notifications.css';

function Map() {
  const mountRef = useRef<HTMLDivElement>(null);
  const userModel = useAppSelector(state => state.auth.userModel);
  const [modelLoaded, setModelLoaded] = useState(false);

  useEffect(() => {
    if (!mountRef.current) return;
    
    console.log("Инициализация карты");
    
    // 1. Инициализация сцены, камеры и рендерера
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xFFFFFF);
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    mountRef.current.appendChild(renderer.domElement);

    // 2. Создаем плоскость (3D-карту)
    const planeGeometry = new THREE.PlaneGeometry(10, 10);
    const planeMaterial = new THREE.MeshBasicMaterial({
      color: 0x6c7990,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7
    });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.position.x = 5;
    plane.rotation.x = -Math.PI / 2; // Поворачиваем плоскость, чтобы она была горизонтальной
    scene.add(plane);

    // 3. Создаем сетку на плоскости
    const gridSize = 10;
    const divisions = 10;
    const gridColor1 = new THREE.Color(0x333333);
    const gridColor2 = new THREE.Color(0xd4dae4);
    
    const gridHelper = new THREE.GridHelper(gridSize, divisions, gridColor1, gridColor2);
    gridHelper.position.x = 5;
    gridHelper.position.y = 0.01; // Чуть выше плоскости чтобы избежать z-fighting
    scene.add(gridHelper);

    // 4. Настройка камеры
    camera.position.set(10, 5, 5);
    camera.lookAt(5, 0, 0);

    // 5. Добавляем OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(5, 0, 0); // Центр вращения камеры

    // 6. Добавим свет для лучшей видимости
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8); // Увеличиваем интенсивность
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0); // Увеличиваем интенсивность
    directionalLight.position.set(5, 10, 5);
    scene.add(directionalLight);

    // Добавляем точечный свет для лучшей видимости объекта
    const pointLight = new THREE.PointLight(0xffffff, 1.0);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);

    // Создаем для отладки
    const axesHelper = new THREE.AxesHelper(5);
    scene.add(axesHelper);

    // Создаем три сферы разных цветов на осях для отладки
    const sphereGeometry = new THREE.SphereGeometry(0.2, 16, 16);
    
    const sphereX = new THREE.Mesh(
        sphereGeometry,
        new THREE.MeshBasicMaterial({ color: 0xff0000 }) // Красный - ось X
    );
    sphereX.position.set(7, 0, 0);
    scene.add(sphereX);
    
    const sphereY = new THREE.Mesh(
        sphereGeometry,
        new THREE.MeshBasicMaterial({ color: 0x00ff00 }) // Зеленый - ось Y
    );
    sphereY.position.set(5, 2, 0);
    scene.add(sphereY);
    
    const sphereZ = new THREE.Mesh(
        sphereGeometry,
        new THREE.MeshBasicMaterial({ color: 0x0000ff }) // Синий - ось Z
    );
    sphereZ.position.set(5, 0, 2);
    scene.add(sphereZ);

    // Создаем TransformControls 
    const transformControls = new TransformControls(camera, renderer.domElement);
    transformControls.size = 1.5; // Устанавливаем размер напрямую
    
    // Отключаем OrbitControls, когда пользователь взаимодействует с TransformControls
    transformControls.addEventListener('dragging-changed', (event) => {
      controls.enabled = !event.value;
    });
    
    // Добавляем на сцену используя стандартный подход
    scene.add(transformControls as any);

    // Создаем удобную панель управления с инструкцией
    const createInfoPanel = () => {
      // Удаляем существующую панель, если она есть
      const existingPanel = document.getElementById('transform-info-panel');
      if (existingPanel) {
        existingPanel.parentNode?.removeChild(existingPanel);
      }
      
      const panel = document.createElement('div');
      panel.id = 'transform-info-panel';
      
      panel.innerHTML = `
        <h3>Управление моделью</h3>
        <div style="margin-bottom: 10px;">
          <button id="translate-mode" class="transform-btn active">Перемещение</button>
          <button id="rotate-mode" class="transform-btn">Вращение</button>
          <button id="scale-mode" class="transform-btn">Масштаб</button>
        </div>
        <div style="margin-top: 15px;">
          <p><strong>Как использовать:</strong></p>
          <ul style="padding-left: 20px; margin-bottom: 10px;">
            <li>Красная ось - X</li>
            <li>Зеленая ось - Y</li>
            <li>Синяя ось - Z</li>
          </ul>
          <p><strong>Перемещение:</strong> Тяните за стрелки для перемещения по осям</p>
          <p><strong>Вращение:</strong> Тяните за цветные окружности для вращения вокруг осей</p>
          <p><strong>Масштаб:</strong> Тяните за кубики для масштабирования</p>
        </div>
      `;
      
      document.body.appendChild(panel);
      
      // Добавляем обработчики событий для кнопок
      const translateBtn = document.getElementById('translate-mode');
      const rotateBtn = document.getElementById('rotate-mode');
      const scaleBtn = document.getElementById('scale-mode');
      
      if (translateBtn && rotateBtn && scaleBtn) {
        translateBtn.addEventListener('click', () => {
          transformControls.mode = 'translate';
          translateBtn.classList.add('active');
          rotateBtn.classList.remove('active');
          scaleBtn.classList.remove('active');
        });
        
        rotateBtn.addEventListener('click', () => {
          transformControls.mode = 'rotate';
          translateBtn.classList.remove('active');
          rotateBtn.classList.add('active');
          scaleBtn.classList.remove('active');
        });
        
        scaleBtn.addEventListener('click', () => {
          transformControls.mode = 'scale';
          translateBtn.classList.remove('active');
          rotateBtn.classList.remove('active');
          scaleBtn.classList.add('active');
        });
      }
    };
    
    // Переменная для хранения загруженной пользовательской модели
    let loadedUserModel: THREE.Object3D | null = null;

    // Загрузчик GLTF для пользовательских моделей
    const gltfLoader = new GLTFLoader();

    // Функция для загрузки модели
    const loadUserModel = (url: string) => {
      // Показываем индикатор загрузки
      const loadingNotification = document.createElement('div');
      loadingNotification.className = 'model-loading-notification';
      loadingNotification.textContent = 'Загрузка модели на карту...';
      document.body.appendChild(loadingNotification);

      console.log('Начинаем загрузку модели:', url);

      try {
        // Загружаем модель
        gltfLoader.load(
          url,
          (gltf) => {
            console.log('Модель успешно загружена:', gltf);
            
            // Удаляем старую модель, если она есть
            if (loadedUserModel) {
              transformControls.detach();
              scene.remove(loadedUserModel);
            }
            
            loadedUserModel = gltf.scene;
            
            // Настройка модели для корректного отображения
            loadedUserModel.position.set(5, 0.5, 0); // Центр карты, немного выше плоскости
            loadedUserModel.scale.set(0.5, 0.5, 0.5); // Масштабируем модель
            
            // Добавляем в сцену
            scene.add(loadedUserModel);
            
            // Привязываем элементы управления к модели
            transformControls.attach(loadedUserModel);
            transformControls.mode = 'translate'; // По умолчанию режим перемещения
            
            // Показываем панель с инструкциями
            createInfoPanel();
            
            // Устанавливаем флаг, что модель загружена
            setModelLoaded(true);
            
            // Удаляем индикатор загрузки
            if (loadingNotification.parentNode) {
              loadingNotification.parentNode.removeChild(loadingNotification);
            }
            
            // Показываем уведомление об успешной загрузке
            const notification = document.createElement('div');
            notification.className = 'model-success-notification';
            notification.textContent = 'Модель размещена на карте. Используйте цветные стрелки и кольца для управления.';
            document.body.appendChild(notification);
            
            setTimeout(() => {
              if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
              }
            }, 5000);
          },
          (xhr) => {
            // Прогресс загрузки
            const progress = Math.round((xhr.loaded / xhr.total) * 100);
            console.log(`Загрузка: ${progress}%`);
            if (loadingNotification.parentNode) {
              loadingNotification.textContent = `Загрузка модели на карту... ${progress}%`;
            }
          },
          (error) => {
            // Ошибка загрузки
            console.error('Ошибка при загрузке модели:', error);
            if (loadingNotification.parentNode) {
              loadingNotification.parentNode.removeChild(loadingNotification);
            }
            
            const errorNotification = document.createElement('div');
            errorNotification.style.position = 'fixed';
            errorNotification.style.bottom = '100px';
            errorNotification.style.left = '50%';
            errorNotification.style.transform = 'translateX(-50%)';
            errorNotification.style.background = 'rgba(255, 0, 0, 0.8)';
            errorNotification.style.color = 'white';
            errorNotification.style.padding = '10px 15px';
            errorNotification.style.borderRadius = '5px';
            errorNotification.style.zIndex = '99999';
            errorNotification.textContent = 'Ошибка при загрузке модели. Пожалуйста, попробуйте другую модель.';
            document.body.appendChild(errorNotification);
            
            setTimeout(() => {
              if (errorNotification.parentNode) {
                errorNotification.parentNode.removeChild(errorNotification);
              }
            }, 5000);
          }
        );
      } catch (e) {
        console.error('Ошибка при вызове gltfLoader:', e);
        if (loadingNotification.parentNode) {
          loadingNotification.parentNode.removeChild(loadingNotification);
        }
      }
    };

    // Загружаем модель пользователя, если она доступна
    if (userModel && userModel.url) {
      console.log('Доступна пользовательская модель:', userModel);
      loadUserModel(userModel.url);
    } else {
      console.log('Пользовательская модель не найдена');
    }

    // 7. Обработка изменения размера окна
    const handleResize = () => {
      if (!mountRef.current) return;
      const width = mountRef.current.clientWidth;
      const height = mountRef.current.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);
    handleResize(); // Инициализация размеров

    // 8. Анимация
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update(); // Обновление контролов
      renderer.render(scene, camera);
    };
    animate();

    // 9. Очистка
    return () => {
      console.log('Очистка ресурсов карты');
      window.removeEventListener('resize', handleResize);
      
      // Удаляем UI элементы
      const infoPanel = document.getElementById('transform-info-panel');
      if (infoPanel && infoPanel.parentNode) {
        infoPanel.parentNode.removeChild(infoPanel);
      }
      
      if (mountRef.current && renderer.domElement.parentNode === mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }

      // Освобождаем ресурсы Three.js
      renderer.dispose();
      if (loadedUserModel) {
        scene.remove(loadedUserModel);
      }
    };
  }, [userModel]); // зависимости: только userModel

  return <div ref={mountRef} style={{ width: '100%', height: '100vh' }} />;
}

export default Map; 