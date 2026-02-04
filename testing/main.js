import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

// --- CONFIGURATION ---
const CONFIG = {
    particleSize: 2.5,
    orbitSpeed: 0.08,
    camFov: 50,
    colors: {
        core: 0xffaa55,      // Vàng cam (Lõi)
        bar: 0xffdca0,       // Vàng nhạt (Thanh chắn)
        arms: 0xaaccff,      // Xanh dương (Cánh tay)
        dust: 0x334455,      // Bụi tối
        nebula: 0xff0055     // Hồng (Tinh vân)
    }
};

const PLANETS = [
    { name: "Mercury", r: 3, dist: 35, particles: 3000, speed: 4.0, realDist: "57.9 M km", realSpeed: "47.9 km/s", realDia: "4,880 km", desc: "Hành tinh gần mặt trời nhất." },
    { name: "Venus", r: 4.5, dist: 50, particles: 5000, speed: 3.0, realDist: "108.2 M km", realSpeed: "35.0 km/s", realDia: "12,104 km", desc: "Hành tinh nóng nhất hệ mặt trời." },
    { name: "Earth", r: 5, dist: 75, particles: 10000, speed: 2.0, hasClouds: true, realDist: "149.6 M km", realSpeed: "29.8 km/s", realDia: "12,742 km", desc: "Hành tinh xanh duy nhất có sự sống." },
    { name: "Mars", r: 3.5, dist: 100, particles: 6000, speed: 1.6, realDist: "227.9 M km", realSpeed: "24.1 km/s", realDia: "6,779 km", desc: "Hành tinh Đỏ đầy bụi và bão." },
    { name: "Jupiter", r: 14, dist: 160, particles: 25000, speed: 0.8, realDist: "778.5 M km", realSpeed: "13.1 km/s", realDia: "139,820 km", desc: "Hành tinh khí khổng lồ lớn nhất." },
    { name: "Saturn", r: 11, dist: 220, particles: 20000, speed: 0.5, hasRings: true, realDist: "1.4 B km", realSpeed: "9.7 km/s", realDia: "116,460 km", desc: "Nổi tiếng với vành đai băng lộng lẫy." },
    { name: "Uranus", r: 7, dist: 270, particles: 10000, speed: 0.3, realDist: "2.9 B km", realSpeed: "6.8 km/s", realDia: "50,724 km", desc: "Hành tinh băng nghiêng trục 98 độ." },
    { name: "Neptune", r: 6.8, dist: 320, particles: 10000, speed: 0.2, realDist: "4.5 B km", realSpeed: "5.4 km/s", realDia: "49,244 km", desc: "Hành tinh xa nhất với gió siêu thanh." }
];

// --- SCENE SETUP ---
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x020205, 0.0000015);

const camera = new THREE.PerspectiveCamera(CONFIG.camFov, window.innerWidth/window.innerHeight, 1, 600000);
camera.position.set(0, 180, 400);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(window.innerWidth, window.innerHeight);
labelRenderer.domElement.style.position = 'absolute';
labelRenderer.domElement.style.top = '0px';
document.body.appendChild(labelRenderer.domElement);

const controls = new OrbitControls(camera, labelRenderer.domElement);
controls.enableDamping = true; controls.dampingFactor = 0.05;
controls.maxDistance = 350000; controls.autoRotate = true; controls.autoRotateSpeed = 0.15;

scene.add(new THREE.AmbientLight(0x333355, 0.4));
scene.add(new THREE.PointLight(0xffaa00, 2.5, 1200));

// --- TEXTURES ---
function createTexture(type) {
    const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(32,32,0, 32,32,32);
    if(type==='star'){ grad.addColorStop(0,'rgba(255,255,255,1)'); grad.addColorStop(0.3,'rgba(255,255,255,0.4)'); grad.addColorStop(1,'rgba(0,0,0,0)'); }
    else { grad.addColorStop(0,'rgba(255,255,255,0.8)'); grad.addColorStop(0.5,'rgba(255,255,255,0.2)'); grad.addColorStop(1,'rgba(0,0,0,0)'); }
    ctx.fillStyle = grad; ctx.fillRect(0,0,64,64); return new THREE.CanvasTexture(canvas);
}
const starTexture = createTexture('star');
const cloudTexture = createTexture('cloud');
const galaxyMaterial = new THREE.PointsMaterial({
    size: CONFIG.particleSize, map: starTexture, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, vertexColors: true, opacity: 0.9
});

// --- MILKY WAY GENERATOR (V3 LOGIC) ---
let galaxySystem;
function createMilkyWay() {
    const params = { count: 180000, radius: 85000, branches: 2, spin: 1.5, randomness: 0.8, randomnessPower: 3, barLength: 12000, bulgeHeight: 3000 };
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(params.count * 3);
    const colors = new Float32Array(params.count * 3);
    
    const cCore = new THREE.Color(CONFIG.colors.core);
    const cBar = new THREE.Color(CONFIG.colors.bar);
    const cArms = new THREE.Color(CONFIG.colors.arms);
    const cNebula = new THREE.Color(CONFIG.colors.nebula);

    for (let i = 0; i < params.count; i++) {
        const i3 = i * 3;
        const rRatio = Math.pow(Math.random(), 2);
        const r = rRatio * params.radius;
        let spinAngle = r * params.spin * 0.00015;
        if (r < params.barLength) spinAngle *= (r / params.barLength);

        const branchAngle = (i % params.branches) / params.branches * Math.PI * 2;
        const rndX = Math.pow(Math.random(), params.randomnessPower) * (Math.random()<0.5?1:-1) * params.randomness * r;
        const rndZ = Math.pow(Math.random(), params.randomnessPower) * (Math.random()<0.5?1:-1) * params.randomness * r;
        let bulge = Math.pow(1 - rRatio, 4);
        const rndY = (Math.random()-0.5) * (params.radius*0.05 + bulge*params.bulgeHeight*2);

        const dustNoise = Math.sin((branchAngle + spinAngle) * params.branches * 2 + r * 0.0001);
        const isDust = (r > params.barLength && dustNoise > 0.6);

        positions[i3] = Math.cos(branchAngle + spinAngle) * r + rndX;
        positions[i3+1] = rndY;
        positions[i3+2] = Math.sin(branchAngle + spinAngle) * r + rndZ;

        const mix = cCore.clone();
        if (r < params.barLength) mix.lerp(cBar, r / params.barLength);
        else {
            mix.copy(cBar).lerp(cArms, (r - params.barLength) / (params.radius*0.5));
            if (!isDust && Math.random() > 0.94) { mix.lerp(cNebula, 0.8); mix.r += 0.2; }
        }
        if (isDust) { mix.multiplyScalar(0.2); mix.b += 0.1; }
        mix.r += (Math.random()-0.5)*0.05; mix.g += (Math.random()-0.5)*0.05; mix.b += (Math.random()-0.5)*0.05;
        colors[i3] = mix.r; colors[i3+1] = mix.g; colors[i3+2] = mix.b;
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const mat = galaxyMaterial.clone(); mat.size = 200; mat.sizeAttenuation = true; mat.opacity = 0.8;
    galaxySystem = new THREE.Points(geometry, mat);
    galaxySystem.position.y = -3000; galaxySystem.rotation.x = 0.5; galaxySystem.rotation.z = 0.1;
    scene.add(galaxySystem);
}
createMilkyWay();

// --- PLANET HELPERS ---
function noise3D(x, y, z, scale = 1.0, seed = 0) { return Math.sin(x*scale + seed) * Math.cos(y*scale + seed) * Math.sin(z*scale + seed); }
function getFibPoints(n, r) {
    const pts = []; const phi = Math.PI*(3-Math.sqrt(5));
    for(let i=0; i<n; i++){ const y=1-(i/(n-1))*2; const rad=Math.sqrt(1-y*y); const t=phi*i; pts.push(Math.cos(t)*rad*r, y*r, Math.sin(t)*rad*r); }
    return pts;
}
function getCol(name, x, y, z, r) {
    const c = new THREE.Color(); const nY = Math.abs(y/r);
    if(name==="Earth"){
        const con=noise3D(x,y,z,0.45)+noise3D(x,y,z,1.2)*0.5;
        if(nY>0.88)c.setHex(0xFFFFFF); else if(con>0.35)c.setHex(con>0.65?0x8B4513:(con<0.42?0xD2B48C:0x2E8B57)); else{c.setHex(0x001144);if(con>0.2)c.setHex(0x004499);}
    } else if(name==="Jupiter"){
        const b=Math.sin(y*1.8)+noise3D(x,z,y,0.4)*0.3; if(x>r*0.4&&x<r*0.8&&y>-r*0.35&&y<-r*0.1&&z>0)c.setHex(0x992200); else c.setHex(b>0.6?0xF0E2C8:(b>0.2?0xCFA374:(b>-0.3?0x7A5A40:0xE0C090)));
    } else if(name==="Mars"){ c.setHex(noise3D(x,y,z,0.7)>0.5?0x8B3311:0xCC4422); if(nY>0.93)c.setHex(0xFFFFFF);
    } else if(name==="Venus") c.setHex(noise3D(x,y,z,0.5)+Math.sin(y*2)>0.5?0xFFCC66:0xFFAA33);
    else if(name==="Mercury") c.setHex(noise3D(x,y,z,1.5)>0.5?0x777777:0xAAAAAA);
    else if(name==="Saturn") c.setHex(Math.sin(y*3)>0.5?0xD6BC92:0xEAD6B8);
    else if(name==="Uranus") c.setHex(0x73D7EE);
    else if(name==="Neptune") c.setHex(noise3D(x,y,z,0.9)>0.7?0x112266:0x3355FF);
    c.offsetHSL(0,0,(Math.random()-0.5)*0.08); return c;
}

// --- SUN ---
let sunParticles;
function createSun() {
    const r=18; const pts=getFibPoints(15000, r);
    const cols=[]; const c1=new THREE.Color(0xFFCC00), c2=new THREE.Color(0xFF2200);
    for(let i=0;i<pts.length;i+=3) { const d=Math.sqrt(pts[i]**2+pts[i+1]**2+pts[i+2]**2); const t=(d-r)/12; const c=c1.clone().lerp(c2,t); cols.push(c.r,c.g,c.b); }
    const geo=new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(pts,3)).setAttribute('color', new THREE.Float32BufferAttribute(cols,3));
    const mesh=new THREE.Points(geo, galaxyMaterial.clone()); mesh.material.size=3.5; mesh.material.map=starTexture; sunParticles=mesh;
    
    const div=document.createElement('div'); div.className='label'; div.textContent='SUN';
    div.onclick=()=>focusOn(mesh,0,'SUN', div);
    const label=new CSS2DObject(div); label.position.set(0,r+5,0); mesh.add(label);
    return mesh;
}
scene.add(createSun());

// --- STARS ---
let starMesh;
function createBgStars() {
    const pts=[]; for(let i=0;i<15000;i++) pts.push((Math.random()-0.5)*150000,(Math.random()-0.5)*150000,(Math.random()-0.5)*150000);
    const geo=new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(pts,3));
    const mat=galaxyMaterial.clone(); mat.size=3; mat.opacity=0.8; mat.color.setHex(0xAADDFF);
    starMesh=new THREE.Points(geo, mat); scene.add(starMesh);
}
createBgStars();

// --- PLANET SYSTEM & UI LINKING ---
const planetSystems = [];
let focusTarget = null;
const navList = document.getElementById('nav-list');

PLANETS.forEach(data => {
    const group=new THREE.Group();
    const pts=getFibPoints(data.particles, data.r);
    const cols=[]; for(let i=0;i<pts.length;i+=3){const c=getCol(data.name,pts[i],pts[i+1],pts[i+2],data.r); cols.push(c.r,c.g,c.b);}
    const mesh=new THREE.Points(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(pts,3)).setAttribute('color',new THREE.Float32BufferAttribute(cols,3)), galaxyMaterial.clone());
    mesh.material.size=CONFIG.particleSize; group.add(mesh);

    if(data.hasClouds||data.name==="Venus"){
        const cPts=getFibPoints(3500,data.r*1.06); const cGeo=new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(cPts,3));
        const cMat=galaxyMaterial.clone(); cMat.color.setHex(0xFFFFFF); cMat.opacity=data.name==="Venus"?0.2:0.4; cMat.size=CONFIG.particleSize*0.9; cMat.map=cloudTexture;
        const cl=new THREE.Points(cGeo,cMat); cl.userData.isCloud=true; group.add(cl);
    }
    if(data.hasRings){
        const rPts=[], rCols=[]; const inn=data.r*1.3, out=data.r*2.5;
        for(let k=0;k<20000;k++){ const a=Math.random()*Math.PI*2; const rad=Math.sqrt(Math.random()*(out**2-inn**2)+inn**2); if(rad>data.r*1.9&&rad<data.r*2.05)continue; rPts.push(Math.cos(a)*rad,(Math.random()-0.5)*0.15,Math.sin(a)*rad); const rc=new THREE.Color(0xD6BC92); if(rad>data.r*2.1)rc.setHex(0xA89F91); rc.offsetHSL(0,0,(Math.random()-0.5)*0.1); rCols.push(rc.r,rc.g,rc.b); }
        const rM=new THREE.Points(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(rPts,3)).setAttribute('color',new THREE.Float32BufferAttribute(rCols,3)), galaxyMaterial.clone());
        rM.rotation.x=0.45; rM.material.opacity=0.6; rM.material.size=1.4; group.add(rM);
    }

    const div=document.createElement('div'); div.className='label'; div.textContent=data.name;
    div.onclick=()=>focusOn(group, data.r, data.name, div);
    const label=new CSS2DObject(div); label.position.set(0, data.r+3, 0); group.add(label);

    const path=new THREE.Line(new THREE.BufferGeometry().setFromPoints(new THREE.EllipseCurve(0,0,data.dist,data.dist,0,2*Math.PI).getPoints(120)), new THREE.LineBasicMaterial({color:0xffffff, opacity:0.05, transparent:true}));
    path.rotation.x=Math.PI/2; scene.add(path);
    scene.add(group);

    group.userData = { ...data, labelDiv: div };
    planetSystems.push({ mesh: group, data: data });

    const btn=document.createElement('div'); btn.className='nav-btn'; btn.textContent=data.name;
    btn.onclick=()=>focusOn(group, data.r, data.name, div);
    if(navList) navList.appendChild(btn);
    group.userData.navBtn = btn;
});

// --- INTERACTION LOGIC ---
function focusOn(target, radius, name, labelDiv) {
    document.querySelectorAll('.label').forEach(e=>e.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(e=>e.classList.remove('active'));
    if(labelDiv) labelDiv.classList.add('active');
    if(target.userData.navBtn) target.userData.navBtn.classList.add('active');

    const info=document.getElementById('info-box');
    if(name==='SUN'){
        if(info) info.classList.remove('visible');
        document.getElementById('status-bar').innerText = "TARGET: SOLAR CORE";
    } else {
        const d=target.userData;
        if(document.getElementById('p-name')) document.getElementById('p-name').textContent = d.name.toUpperCase();
        if(document.getElementById('p-dist')) document.getElementById('p-dist').textContent = d.realDist;
        if(document.getElementById('p-speed')) document.getElementById('p-speed').textContent = d.realSpeed;
        if(document.getElementById('p-radius')) document.getElementById('p-radius').textContent = d.realDia;
        if(document.getElementById('p-desc')) document.getElementById('p-desc').textContent = d.desc;
        if(info) info.classList.add('visible');
        document.getElementById('status-bar').innerText = "ANALYZING: " + name;
    }
    controls.autoRotate = false;
    focusTarget = { obj: target, dist: radius>0?radius*4+10:80 };
}

// --- RESET CAMERA FUNCTION ---
window.resetCamera = function() {
    focusTarget = null;
    document.getElementById('status-bar').innerText = "SYSTEM OVERVIEW";
    if(document.getElementById('info-box')) document.getElementById('info-box').classList.remove('visible');
    document.querySelectorAll('.label').forEach(e=>e.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(e=>e.classList.remove('active'));

    const s=camera.position.clone();
    const e=new THREE.Vector3(0,180,400); // Vị trí chuẩn để nhìn thấy hệ mặt trời
    let a=0;
    function b(){ a+=0.02; if(a<=1){ camera.position.lerpVectors(s,e,a); controls.target.lerp(new THREE.Vector3(0,0,0),0.05); requestAnimationFrame(b); } else controls.autoRotate=true; }
    b();
}

// --- ANIMATION ---
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
        const tPos = new THREE.Vector3(); focusTarget.obj.getWorldPosition(tPos);
        controls.target.lerp(tPos, 0.08);
        const offset = camera.position.clone().sub(tPos);
        const newD = THREE.MathUtils.lerp(offset.length(), focusTarget.dist, 0.08);
        offset.setLength(newD); camera.position.copy(tPos.clone().add(offset));
    }

    const dist = camera.position.length();
    
    // Logic Galaxy (V3)
    if(galaxySystem) {
        galaxySystem.rotation.y = -time * 0.001; 
        const op = THREE.MathUtils.clamp((dist - 3000) / 7000, 0.1, 1);
        galaxySystem.material.opacity = op * 0.9;
    }

    const labels = document.querySelectorAll('.label');
    if(dist > 7000) { 
        labels.forEach(l => l.classList.add('hidden')); 
        document.getElementById('status-bar').innerText = "INTERSTELLAR SPACE - MILKY WAY";
        if(navList) navList.style.opacity = '0';
    } else { 
        labels.forEach(l => l.classList.remove('hidden')); 
        if(navList) navList.style.opacity = '1';
    }
    
    if(starMesh) starMesh.material.opacity = 0.5 + Math.sin(time*3)*0.2;

    controls.update(); labelRenderer.render(scene, camera); renderer.render(scene, camera);
}
window.addEventListener('resize', () => { camera.aspect = window.innerWidth/window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); labelRenderer.setSize(window.innerWidth, window.innerHeight); });
animate();