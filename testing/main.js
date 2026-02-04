import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

// --- CẤU HÌNH & DỮ LIỆU ---
const CONFIG = { particleSize: 2.2, orbitSpeed: 0.08, camFov: 45 };

const PLANETS = [
    { name: "Mercury", r: 3, dist: 35, particles: 3000, speed: 4.0, 
      realDist: "57.9 M km", realSpeed: "47.9 km/s", desc: "Hành tinh gần mặt trời nhất, nhiệt độ thay đổi cực đoan." },
    { name: "Venus", r: 4.5, dist: 50, particles: 5000, speed: 3.0,
      realDist: "108.2 M km", realSpeed: "35.0 km/s", desc: "Hành tinh nóng nhất do hiệu ứng nhà kính dày đặc." },
    { name: "Earth", r: 5, dist: 75, particles: 10000, speed: 2.0, hasClouds: true,
      realDist: "149.6 M km", realSpeed: "29.8 km/s", desc: "Hành tinh duy nhất có sự sống và đại dương nước lỏng." },
    { name: "Mars", r: 3.5, dist: 100, particles: 6000, speed: 1.6,
      realDist: "227.9 M km", realSpeed: "24.1 km/s", desc: "Hành tinh Đỏ, mục tiêu tiếp theo của nhân loại." },
    { name: "Jupiter", r: 14, dist: 160, particles: 25000, speed: 0.8,
      realDist: "778.5 M km", realSpeed: "13.1 km/s", desc: "Vua của các hành tinh, khối khí khổng lồ với Vết Đỏ Lớn." },
    { name: "Saturn", r: 11, dist: 220, particles: 20000, speed: 0.5, hasRings: true,
      realDist: "1.4 B km", realSpeed: "9.7 km/s", desc: "Nổi tiếng với hệ vành đai băng đá tuyệt đẹp." },
    { name: "Uranus", r: 7, dist: 270, particles: 10000, speed: 0.3,
      realDist: "2.9 B km", realSpeed: "6.8 km/s", desc: "Hành tinh băng khổng lồ quay nghiêng 98 độ." },
    { name: "Neptune", r: 6.8, dist: 320, particles: 10000, speed: 0.2,
      realDist: "4.5 B km", realSpeed: "5.4 km/s", desc: "Hành tinh xa nhất, nơi có những cơn gió mạnh nhất." }
];

// --- SETUP SCENE ---
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000000, 0.000005);
const camera = new THREE.PerspectiveCamera(CONFIG.camFov, window.innerWidth/window.innerHeight, 1, 100000);
camera.position.set(0, 180, 400);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(window.innerWidth, window.innerHeight);
labelRenderer.domElement.style.position = 'absolute';
labelRenderer.domElement.style.top = '0px';
document.body.appendChild(labelRenderer.domElement);

const controls = new OrbitControls(camera, labelRenderer.domElement);
controls.enableDamping = true; controls.dampingFactor = 0.05;
controls.maxDistance = 60000; controls.autoRotate = true; controls.autoRotateSpeed = 0.3;

// --- CORE MATERIALS ---
function createGlowDot() {
    const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(32,32,0, 32,32,32);
    grad.addColorStop(0, 'rgba(255,255,255,1)'); grad.addColorStop(0.4, 'rgba(255,255,255,0.5)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad; ctx.fillRect(0,0,64,64);
    return new THREE.CanvasTexture(canvas);
}
const particleMat = new THREE.PointsMaterial({
    size: CONFIG.particleSize, map: createGlowDot(), transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false, vertexColors: true, opacity: 0.9
});

// --- GALAXY (GIỮ NGUYÊN CODE CŨ CỦA BẠN) ---
let galaxyMesh;
function createBarredSpiralGalaxy() {
    const parameters = { count: 60000, radius: 35000, branches: 2, spin: 1.5, randomness: 0.6, randomnessPower: 3, insideColor: 0xffddaa, outsideColor: 0x4488ff };
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(parameters.count * 3);
    const colors = new Float32Array(parameters.count * 3);
    const colorInside = new THREE.Color(parameters.insideColor);
    const colorOutside = new THREE.Color(parameters.outsideColor);

    for (let i = 0; i < parameters.count; i++) {
        const i3 = i * 3;
        const r = Math.pow(Math.random(), 1.5) * parameters.radius;
        let spinAngle = r * parameters.spin * 0.0001;
        let branchAngle = (i % parameters.branches) * ((Math.PI * 2) / parameters.branches);
        if (r < 6000) { spinAngle = spinAngle * (r / 6000); branchAngle += (Math.random()-0.5) * 0.2; }

        const randomX = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * parameters.randomness * r;
        const randomY = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * parameters.randomness * r * 0.15;
        const randomZ = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * parameters.randomness * r;

        positions[i3] = Math.cos(branchAngle + spinAngle) * r + randomX;
        positions[i3 + 1] = randomY;
        positions[i3 + 2] = Math.sin(branchAngle + spinAngle) * r + randomZ;

        const mixedColor = colorInside.clone().lerp(colorOutside, r / parameters.radius);
        if(Math.random() > 0.8) { mixedColor.multiplyScalar(0.8); mixedColor.r += 0.1; }
        colors[i3] = mixedColor.r; colors[i3 + 1] = mixedColor.g; colors[i3 + 2] = mixedColor.b;
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const material = particleMat.clone();
    material.size = 150; material.opacity = 0; material.sizeAttenuation = true; material.depthWrite = false;
    galaxyMesh = new THREE.Points(geometry, material);
    galaxyMesh.rotation.x = 0.2; galaxyMesh.position.y = -500;
    scene.add(galaxyMesh);
}
createBarredSpiralGalaxy();

// --- MATH UTILS ---
function noise3D(x, y, z, scale = 1.0, seed = 0) { return Math.sin(x*scale + seed) * Math.cos(y*scale + seed) * Math.sin(z*scale + seed); }
function getFibonacciSpherePoints(samples, radius) {
    const points = []; const phi = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < samples; i++) {
        const y = 1 - (i / (samples - 1)) * 2; const r = Math.sqrt(1 - y * y); const theta = phi * i;
        points.push(Math.cos(theta)*r*radius, y*radius, Math.sin(theta)*r*radius);
    } return points;
}
function getPlanetColor(name, x, y, z, r) {
    const c = new THREE.Color(); const normY = y / r; const absY = Math.abs(normY);
    if (name === "Earth") {
        const continent = noise3D(x, y, z, 0.45) + noise3D(x, y, z, 1.2)*0.5;
        if (absY > 0.88) c.setHex(0xFFFFFF); else if (continent > 0.35) { c.setHex(continent > 0.65 ? 0x8B4513 : (continent < 0.42 ? 0xD2B48C : 0x2E8B57)); } 
        else { c.setHex(0x001144); if(continent > 0.2) c.setHex(0x004499); }
    } else if (name === "Jupiter") {
        const bands = Math.sin(y * 1.8) + noise3D(x, z, y, 0.4)*0.3;
        if(x > r*0.4 && x < r*0.8 && y > -r*0.35 && y < -r*0.1 && z > 0) c.setHex(0x992200);
        else c.setHex(bands > 0.6 ? 0xF0E2C8 : (bands > 0.2 ? 0xCFA374 : (bands > -0.3 ? 0x7A5A40 : 0xE0C090)));
    } else if (name === "Mars") { c.setHex(noise3D(x, y, z, 0.7) > 0.5 ? 0x8B3311 : 0xCC4422); if(absY > 0.93) c.setHex(0xFFFFFF);
    } else if (name === "Venus") { c.setHex(noise3D(x, y, z, 0.5) + Math.sin(y*2) > 0.5 ? 0xFFCC66 : 0xFFAA33);
    } else if (name === "Mercury") { c.setHex(noise3D(x,y,z,1.5)>0.5 ? 0x777777 : 0xAAAAAA);
    } else if (name === "Saturn") { c.setHex(Math.sin(y*3) > 0.5 ? 0xD6BC92 : 0xEAD6B8);
    } else if (name === "Uranus") c.setHex(0x73D7EE);
    else if (name === "Neptune") c.setHex(noise3D(x,y,z,0.9)>0.7 ? 0x112266 : 0x3355FF);
    c.offsetHSL(0, 0, (Math.random()-0.5)*0.08); return c;
}

// --- SUN ---
let sunParticles;
function createSun() {
    const r = 18; const pts = getFibonacciSpherePoints(15000, r);
    for(let i=0; i<5000; i++){ const t=Math.random()*Math.PI*2, p=Math.acos(2*Math.random()-1), d=r+Math.random()*12; pts.push(d*Math.sin(p)*Math.cos(t), d*Math.sin(p)*Math.sin(t), d*Math.cos(p)); }
    const geo = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    const cols = []; const c1 = new THREE.Color(0xFFCC00); const c2 = new THREE.Color(0xFF2200);
    for(let i=0; i<pts.length; i+=3) { const d = Math.sqrt(pts[i]**2+pts[i+1]**2+pts[i+2]**2); const t = (d-r)/12; const c = c1.clone().lerp(c2, t); cols.push(c.r, c.g, c.b); }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    const mesh = new THREE.Points(geo, particleMat.clone()); mesh.material.size = 3.5; sunParticles = mesh;
    mesh.add(new THREE.PointLight(0xffaa00, 2, 800));
    
    const div = document.createElement('div'); div.className='label'; div.textContent='SUN';
    div.onclick = () => focusOn(mesh, 0, 'SUN', div);
    const label = new CSS2DObject(div); label.position.set(0, r+5, 0); mesh.add(label);
    return mesh;
}
scene.add(createSun());

// --- PLANETS GENERATION & UI LINKING ---
const planetSystems = [];
let focusTarget = null;
const navList = document.getElementById('nav-list'); 

PLANETS.forEach(data => {
    const group = new THREE.Group();
    const pts = getFibonacciSpherePoints(data.particles, data.r);
    const cols = [];
    for(let i=0; i<pts.length; i+=3){ const c = getPlanetColor(data.name, pts[i], pts[i+1], pts[i+2], data.r); cols.push(c.r, c.g, c.b); }
    const mesh = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)).setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)), particleMat.clone());
    group.add(mesh);

    // Clouds & Rings
    if(data.hasClouds || data.name==="Venus") {
        const cPts = getFibonacciSpherePoints(3500, data.r*1.06); const cGeo = new THREE.BufferGeometry();
        if(data.name==="Earth") { const f=[]; for(let i=0; i<cPts.length; i+=3) if(noise3D(cPts[i], cPts[i+1], cPts[i+2], 0.35, 1)>0.2) f.push(cPts[i], cPts[i+1], cPts[i+2]); cGeo.setAttribute('position', new THREE.Float32BufferAttribute(f, 3)); }
        else cGeo.setAttribute('position', new THREE.Float32BufferAttribute(cPts, 3));
        const cMat = particleMat.clone(); cMat.color.setHex(0xFFFFFF); cMat.opacity = data.name==="Venus"?0.2:0.4; cMat.size=CONFIG.particleSize*0.9;
        const clouds = new THREE.Points(cGeo, cMat); clouds.userData.isCloud=true; group.add(clouds);
    }
    if(data.hasRings) {
        const rPts=[], rCols=[]; const inner=data.r*1.3, outer=data.r*2.5;
        for(let k=0; k<20000; k++){
            const ang=Math.random()*Math.PI*2; const rad=Math.sqrt(Math.random()*(outer**2-inner**2)+inner**2); if(rad>data.r*1.9 && rad<data.r*2.05) continue;
            rPts.push(Math.cos(ang)*rad, (Math.random()-0.5)*0.15, Math.sin(ang)*rad);
            const rc=new THREE.Color(0xD6BC92); if(rad>data.r*2.1) rc.setHex(0xA89F91); rc.offsetHSL(0,0,(Math.random()-0.5)*0.1); rCols.push(rc.r,rc.g,rc.b);
        }
        const rMesh = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(rPts,3)).setAttribute('color', new THREE.Float32BufferAttribute(rCols,3)), particleMat.clone());
        rMesh.rotation.x=0.45; rMesh.material.opacity=0.6; rMesh.material.size=1.4; group.add(rMesh);
    }

    // Labels
    const div = document.createElement('div'); div.className='label'; div.textContent=data.name;
    div.onclick = () => focusOn(group, data.r, data.name, div);
    const label = new CSS2DObject(div); label.position.set(0, data.r+3, 0); group.add(label);

    // Orbit Path
    const path = new THREE.Line(new THREE.BufferGeometry().setFromPoints(new THREE.EllipseCurve(0,0,data.dist,data.dist,0,2*Math.PI).getPoints(120)), new THREE.LineBasicMaterial({color:0xffffff, opacity:0.1, transparent:true}));
    path.rotation.x = Math.PI/2; scene.add(path);

    scene.add(group);
    group.userData = { ...data, labelDiv: div };
    planetSystems.push({ mesh: group, data: data });

    // --- TẠO NÚT BẤM TRÊN MENU ---
    const btn = document.createElement('div'); btn.className = 'nav-btn'; btn.textContent = data.name;
    btn.onclick = () => focusOn(group, data.r, data.name, div);
    navList.appendChild(btn);
    group.userData.navBtn = btn;
});

// --- STARS ---
let starMesh;
function createStars() {
    const pts=[]; for(let i=0; i<8000; i++) pts.push((Math.random()-0.5)*4000,(Math.random()-0.5)*4000,(Math.random()-0.5)*4000);
    const geo=new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(pts,3));
    const mat=particleMat.clone(); mat.size=1.8; mat.opacity=0.6; mat.color.setHex(0xAADDFF);
    starMesh=new THREE.Points(geo, mat); scene.add(starMesh);
}
createStars();

// --- INTERACTION LOGIC (Gắn kết 3D và UI) ---
function focusOn(target, radius, name, labelDiv) {
    // UI Reset
    document.querySelectorAll('.label').forEach(e => e.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(e => e.classList.remove('active'));
    
    // Set Active
    if(labelDiv) labelDiv.classList.add('active');
    if(target.userData && target.userData.navBtn) target.userData.navBtn.classList.add('active');

    // Hiển thị thông tin
    const infoBox = document.getElementById('info-box');
    if(name === 'SUN') {
        infoBox.classList.remove('visible');
        document.getElementById('status-bar').innerText = "TARGET: SOLAR CORE";
    } else {
        const d = target.userData;
        document.getElementById('p-name').textContent = d.name.toUpperCase();
        document.getElementById('p-dist').textContent = d.realDist;
        document.getElementById('p-speed').textContent = d.realSpeed;
        document.getElementById('p-desc').textContent = d.desc;
        infoBox.classList.add('visible');
        document.getElementById('status-bar').innerText = "ANALYZING: " + name;
    }

    // Camera Move
    controls.autoRotate = false;
    const dist = radius > 0 ? radius * 4.0 + 10 : 100;
    focusTarget = { obj: target, dist: dist };
}

window.resetCamera = function() {
    focusTarget = null;
    document.getElementById('status-bar').innerText = "SYSTEM OVERVIEW";
    document.getElementById('info-box').classList.remove('visible');
    document.querySelectorAll('.label').forEach(e => e.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(e => e.classList.remove('active'));

    const s=camera.position.clone(); const e=new THREE.Vector3(0,180,400); let a=0;
    function b(){ a+=0.02; if(a<=1){ camera.position.lerpVectors(s,e,a); controls.target.lerp(new THREE.Vector3(0,0,0),0.05); requestAnimationFrame(b); } else controls.autoRotate=true; }
    b();
}

// --- ANIMATION LOOP ---
const clock = new THREE.Clock();
function animate() {
    requestAnimationFrame(animate);
    const time = clock.getElapsedTime();

    if(sunParticles) sunParticles.rotation.y = time * 0.05;

    planetSystems.forEach(sys => {
        const a = time * sys.data.speed * CONFIG.orbitSpeed;
        sys.mesh.position.x = Math.cos(a) * sys.data.dist;
        sys.mesh.position.z = Math.sin(a) * sys.data.dist;
        sys.mesh.rotation.y = time * 0.1;
        sys.mesh.children.forEach(c => { if(c.userData.isCloud) c.rotation.y = -time * 0.04; });
        if(sys.data.name === 'Jupiter') sys.mesh.children[0].rotation.y = time * 0.2;
    });

    if(focusTarget) {
        const tPos = new THREE.Vector3();
        focusTarget.obj.getWorldPosition(tPos);
        controls.target.lerp(tPos, 0.08);
        const offset = camera.position.clone().sub(tPos);
        const current = offset.length();
        const newD = THREE.MathUtils.lerp(current, focusTarget.dist, 0.08);
        offset.setLength(newD);
        camera.position.copy(tPos.clone().add(offset));
    }

    const dist = camera.position.length();
    
    // Logic ẩn hiện Galaxy và UI khi zoom
    if(galaxyMesh) {
        const op = THREE.MathUtils.clamp((dist - 2000) / 10000, 0, 1);
        galaxyMesh.material.opacity = op;
        galaxyMesh.rotation.y = time * 0.005; 
    }
    
    const labels = document.querySelectorAll('.label');
    const nav = document.getElementById('nav-list');
    if(dist > 3000) { 
        labels.forEach(l => l.classList.add('hidden')); 
        nav.style.opacity = '0'; // Ẩn menu hành tinh khi ra ngoài không gian
        document.getElementById('status-bar').innerText = "INTERSTELLAR SPACE - MILKY WAY";
    } else { 
        labels.forEach(l => l.classList.remove('hidden')); 
        nav.style.opacity = '1';
    }
    
    if(starMesh) starMesh.material.opacity = 0.5 + Math.sin(time*3)*0.2;

    controls.update();
    labelRenderer.render(scene, camera);
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth/window.innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight); labelRenderer.setSize(window.innerWidth, window.innerHeight);
});

animate();