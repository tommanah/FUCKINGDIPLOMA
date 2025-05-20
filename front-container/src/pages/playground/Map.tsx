import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

function Map() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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
    mountRef.current?.appendChild(renderer.domElement);

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
    camera.position.set(10, 1, 0);
    camera.lookAt(0, 0, 0);

    // 5. Добавляем OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 0, 0); // Центр вращения камеры

    // 6. Добавим свет для лучшей видимости
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    scene.add(directionalLight);

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
      window.removeEventListener('resize', handleResize);
      if (mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={mountRef} style={{ width: '100%', height: '100vh' }} />;
}

export default Map; 