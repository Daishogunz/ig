import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

// --- CONFIGURATION ---
const CONFIG = {
    particleSize: 2.2,
    orbitSpeed: 0.08,
    camFov: 50,
    // Màu sắc chuẩn theo quang phổ thiên văn
    colors: {
        core: 0xffaa55,      // Cam cháy (Sao già ở Bulge)
        bar: 0xffdca0,       // Vàng nhạt (Thanh chắn)
        arms: 0xaaccff,      // Xanh trắng (Sao trẻ ở cánh tay)
        dust: 0x334455,      // Xám xanh tối (Bụi biên)
        nebula: 0xff0055     // Hồng đậm (Vùng tạo sao H-II)
    }
};

const PLANETS = [
    { name: "Mercury", r: 3, dist: 35, particles: 3000, speed: 4.0 },
    { name: "Venus", r: 4.5, dist: 50, particles: 5000, speed: 3.0 },
    { name: "Earth", r: 5, dist: 75, particles: 10000, speed: 2.0, hasClouds: true },
    { name: "Mars", r: 3.5, dist: 100, particles: 6000, speed: 1.6 },
    { name: "Jupiter", r: 14, dist: 160, particles: 25000, speed: 0.8 },
    { name: "Saturn", r: 11, dist: 220, particles: 20000, speed: 0.5, hasRings: true },
    { name: "Uranus", r: 7, dist: 270, particles: 10000, speed: 0.3 },
    { name: "Neptune", r: 6.8, dist: 320, particles: 10000, speed: 0.2 }
];

// --- SCENE SETUP ---
const scene = new THREE.Scene();
// Sương mù rất tối, hơi ám xanh tím của vũ trụ sâu
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
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.maxDistance = 300000; 
controls.autoRotate = true;
controls.autoRotateSpeed = 0.15; // Xoay chậm lại cho hùng vĩ

// --- LIGHTS ---
const ambientLight = new THREE.AmbientLight(0x333355, 0.4);
scene.add(ambientLight);
const sunLight = new THREE.PointLight(0xffaa00, 2.5, 1200);
scene.add(sunLight);


// --- TEXTURE GENERATOR ---
function createTexture(type) {
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(32,32,0, 32,32,32);
    
    if (type === 'star') {
        // Hạt sáng sắc nét cho sao
        grad.addColorStop(0, 'rgba(255,255,255,1)');
        grad.addColorStop(0.3, 'rgba(255,255,255,0.4)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
    } else {
        // Hạt mờ đục cho khí/bụi
        grad.addColorStop(0, 'rgba(255,255,255,0.8)');
        grad.addColorStop(0.5, 'rgba(255,255,255,0.2)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
    }
    
    ctx.fillStyle = grad;
    ctx.fillRect(0,0,64,64);
    return new THREE.CanvasTexture(canvas);
}
const starTexture = createTexture('star');
const cloudTexture = createTexture('cloud');

const galaxyMaterial = new THREE.PointsMaterial({
    size: CONFIG.particleSize,
    map: starTexture,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    vertexColors: true,
    opacity: 0.9
});

// --- MILKY WAY GENERATOR (BARRED SPIRAL) ---
let galaxySystem;
function createMilkyWay() {
    const parameters = {
        count: 180000,    
        radius: 85000,    
        branches: 2,      // Milky Way chủ yếu có 2 cánh tay lớn mọc từ thanh chắn
        spin: 1.5,       
        randomness: 0.8,  
        randomnessPower: 3,
        barLength: 12000, // Chiều dài thanh chắn trung tâm
        bulgeHeight: 3000 // Độ phồng của lõi
    };

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(parameters.count * 3);
    const colors = new Float32Array(parameters.count * 3);
    const sizes = new Float32Array(parameters.count); // Kích thước hạt khác nhau

    const colorCore = new THREE.Color(CONFIG.colors.core);
    const colorBar = new THREE.Color(CONFIG.colors.bar);
    const colorArms = new THREE.Color(CONFIG.colors.arms);
    const colorNebula = new THREE.Color(CONFIG.colors.nebula);

    for (let i = 0; i < parameters.count; i++) {
        const i3 = i * 3;

        // Tỷ lệ khoảng cách từ tâm (0 -> 1)
        // Dùng hàm pow để tập trung mật độ cực cao vào lõi
        const rRatio = Math.pow(Math.random(), 2); 
        const r = rRatio * parameters.radius;
        
        // --- LOGIC VỊ TRÍ (Barred Spiral) ---
        let spinAngle = r * parameters.spin * 0.00015;
        
        // Tạo thanh chắn (Bar): Ở gần tâm, góc quay ít thay đổi hơn
        if (r < parameters.barLength) {
            spinAngle *= (r / parameters.barLength); // Làm thẳng góc xoắn lại thành đường thẳng
        }

        const branchAngle = (i % parameters.branches) / parameters.branches * Math.PI * 2;
        
        // Độ nhiễu
        const randomX = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * parameters.randomness * r;
        const randomZ = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * parameters.randomness * r;
        
        // Độ dày (Bulge Logic): Càng gần tâm càng phồng lên (hình hạt đậu)
        let bulgeFactor = 1 - rRatio; 
        bulgeFactor = Math.pow(bulgeFactor, 4); // Làm dốc lên ở tâm
        const spreadY = (Math.random() - 0.5) * (parameters.radius * 0.05 + bulgeFactor * parameters.bulgeHeight * 2);

        // --- DUST LANES (Vệt bụi đen) ---
        // Tạo "sóng" để xóa bớt sao ở giữa các cánh tay, tạo vệt đen
        // Nếu vị trí rơi vào "thung lũng" của sóng sin -> coi là bụi -> bỏ qua hoặc làm tối đi
        const angleCheck = branchAngle + spinAngle;
        const dustNoise = Math.sin(angleCheck * parameters.branches * 2 + r * 0.0001);
        let isDustLane = false;
        if (r > parameters.barLength && dustNoise > 0.6) {
             isDustLane = true;
        }

        // Tọa độ cuối cùng
        positions[i3] = Math.cos(branchAngle + spinAngle) * r + randomX;
        positions[i3 + 1] = spreadY;
        positions[i3 + 2] = Math.sin(branchAngle + spinAngle) * r + randomZ;

        // --- COLOR LOGIC ---
        const mixedColor = colorCore.clone();
        let particleSize = 150 + Math.random() * 100;

        if (r < parameters.barLength) {
            // Vùng Bar & Bulge: Màu Vàng/Cam
            mixedColor.lerp(colorBar, r / parameters.barLength);
            particleSize *= 1.5; // Sao ở lõi trông to hơn do mật độ
        } else {
            // Vùng Arms: Màu Xanh
            mixedColor.copy(colorBar).lerp(colorArms, (r - parameters.barLength) / (parameters.radius * 0.5));
            
            // NEBULA (Vùng tạo sao):
            // Thêm các đốm hồng ngẫu nhiên trên cánh tay (như ảnh Wiki)
            // Chỉ xuất hiện ở cánh tay xoắn (không phải ở bụi)
            if (!isDustLane && Math.random() > 0.94) {
                mixedColor.lerp(colorNebula, 0.8);
                particleSize *= 2.5; // Tinh vân to hơn sao thường
                mixedColor.r += 0.2; // Tăng độ rực
            }
        }

        // Xử lý Vệt bụi: Nếu nằm trong dust lane, làm màu tối đi và trong suốt hơn
        if (isDustLane) {
            mixedColor.multiplyScalar(0.2); // Tối đi
            mixedColor.b += 0.1; // Ám xanh nhẹ của khí lạnh
        }

        // Nhiễu màu nhẹ
        mixedColor.r += (Math.random() - 0.5) * 0.05;
        mixedColor.g += (Math.random() - 0.5) * 0.05;
        mixedColor.b += (Math.random() - 0.5) * 0.05;

        colors[i3] = mixedColor.r;
        colors[i3 + 1] = mixedColor.g;
        colors[i3 + 2] = mixedColor.b;
        
        sizes[i] = particleSize;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    // Dùng attribute size riêng để vertex shader (hoặc material) xử lý nếu cần
    // Nhưng với PointsMaterial mặc định, ta dùng sizeAttenuation. 
    // Để tối ưu, ta clone material ở mức cơ bản, nhưng ở đây mình chỉnh size trung bình to hơn.

    const material = galaxyMaterial.clone();
    material.size = 200; 
    material.sizeAttenuation = true;
    material.opacity = 0.8;

    galaxySystem = new THREE.Points(geometry, material);
    galaxySystem.position.y = -3000; 
    galaxySystem.rotation.x = 0.5; // Nghiêng 1 góc đẹp để thấy rõ cấu trúc Bar
    galaxySystem.rotation.z = 0.1;
    scene.add(galaxySystem);
}
createMilkyWay();


// --- MATH UTILS ---
function noise3D(x, y, z, scale = 1.0, seed = 0) {
    return Math.sin(x*scale + seed) * Math.cos(y*scale + seed) * Math.sin(z*scale + seed);
}

function getPlanetColor(name, x, y, z, r) {
    const c = new THREE.Color();
    const normY = y / r;
    const absY = Math.abs(normY);
    
    if (name === "Earth") {
        const continent = noise3D(x, y, z, 0.45) + noise3D(x, y, z, 1.2)*0.5;
        if (absY > 0.88) c.setHex(0xFFFFFF); 
        else if (continent > 0.35) {
            if(continent > 0.65) c.setHex(0x8B4513);
            else if(continent < 0.42) c.setHex(0xD2B48C);
            else c.setHex(0x2E8B57);
        } else {
            c.setHex(0x001144);
            if(continent > 0.2) c.setHex(0x004499);
        }
    } else if (name === "Jupiter") {
        const bands = Math.sin(y * 1.8) + noise3D(x, z, y, 0.4)*0.3;
        const isSpot = (x > r*0.4 && x < r*0.8 && y > -r*0.35 && y < -r*0.1 && z > 0);
        if(isSpot) c.setHex(0x992200);
        else {
            if (bands > 0.6) c.setHex(0xF0E2C8);
            else if (bands > 0.2) c.setHex(0xCFA374);
            else if (bands > -0.3) c.setHex(0x7A5A40);
            else c.setHex(0xE0C090);
        }
    } else if (name === "Mars") {
        const terrain = noise3D(x, y, z, 0.7);
        c.setHex(0xCC4422); 
        if(terrain > 0.5) c.setHex(0x8B3311);
        if(absY > 0.93) c.setHex(0xFFFFFF);
    } else if (name === "Venus") {
        const clouds = noise3D(x, y, z, 0.5) + Math.sin(y*2);
        c.setHex(0xFFAA33); if(clouds > 0.5) c.setHex(0xFFCC66);
    } else if (name === "Mercury") {
        c.setHex(0xAAAAAA); if(noise3D(x,y,z,1.5)>0.5) c.setHex(0x777777);
    } else if (name === "Saturn") {
        c.setHex(0xEAD6B8); if(Math.sin(y*3) > 0.5) c.setHex(0xD6BC92);
    } else if (name === "Uranus") c.setHex(0x73D7EE);
    else if (name === "Neptune") {
        c.setHex(0x3355FF); if(noise3D(x,y,z,0.9)>0.7) c.setHex(0x112266);
    }
    c.offsetHSL(0, 0, (Math.random()-0.5)*0.08);
    return c;
}

function getFibonacciSpherePoints(samples, radius) {
    const points = [];
    const phi = Math.PI * (3 - Math.sqrt(5)); 
    for (let i = 0; i < samples; i++) {
        const y = 1 - (i / (samples - 1)) * 2; 
        const r = Math.sqrt(1 - y * y); 
        const theta = phi * i; 
        points.push(Math.cos(theta)*r*radius, y*radius, Math.sin(theta)*r*radius);
    }
    return points;
}

// --- SOLAR SYSTEM BUILDERS ---
let sunParticles;
function createSun() {
    const r = 18;
    const pts = getFibonacciSpherePoints(15000, r);
    for(let i=0; i<5000; i++){
        const t=Math.random()*Math.PI*2, p=Math.acos(2*Math.random()-1), d=r+Math.random()*12;
        pts.push(d*Math.sin(p)*Math.cos(t), d*Math.sin(p)*Math.sin(t), d*Math.cos(p));
    }
    const geo = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    const cols = []; const c1 = new THREE.Color(0xFFCC00); const c2 = new THREE.Color(0xFF2200);
    for(let i=0; i<pts.length; i+=3) {
        const d = Math.sqrt(pts[i]**2+pts[i+1]**2+pts[i+2]**2); const t = (d-r)/12;
        const c = c1.clone().lerp(c2, t); cols.push(c.r, c.g, c.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    const mesh = new THREE.Points(geo, galaxyMaterial.clone());
    mesh.material.size = 3.5;
    mesh.material.map = createTexture('star');
    sunParticles = mesh;
    
    const div = document.createElement('div'); div.className='label'; div.textContent='SUN';
    div.onclick = () => focusOn(mesh, 0, 'SUN', div);
    const label = new CSS2DObject(div); label.position.set(0, r+5, 0);
    mesh.add(label);
    return mesh;
}
scene.add(createSun());

const planetSystems = [];
let focusTarget = null;

PLANETS.forEach(data => {
    const group = new THREE.Group();
    const pts = getFibonacciSpherePoints(data.particles, data.r);
    const cols = [];
    for(let i=0; i<pts.length; i+=3){
        const x=pts[i], y=pts[i+1], z=pts[i+2];
        const c = getPlanetColor(data.name, x, y, z, data.r);
        cols.push(c.r, c.g, c.b);
    }
    const geo = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)).setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    const mesh = new THREE.Points(geo, galaxyMaterial.clone());
    mesh.material.size = CONFIG.particleSize;
    group.add(mesh);

    if(data.hasClouds || data.name==="Venus") {
        const cPts = getFibonacciSpherePoints(3500, data.r*1.06);
        const cGeo = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(cPts, 3));
        const cMat = galaxyMaterial.clone();
        cMat.color.setHex(0xFFFFFF); cMat.opacity = data.name==="Venus"?0.2:0.4; cMat.size=CONFIG.particleSize*0.9;
        cMat.map = cloudTexture;
        if(data.name==="Earth") {
            const filtered=[];
            for(let i=0; i<cPts.length; i+=3){
                if(noise3D(cPts[i], cPts[i+1], cPts[i+2], 0.35, 1)>0.2) filtered.push(cPts[i], cPts[i+1], cPts[i+2]);
            }
            cGeo.setAttribute('position', new THREE.Float32BufferAttribute(filtered, 3));
        }
        const clouds = new THREE.Points(cGeo, cMat); clouds.userData.isCloud=true; group.add(clouds);
    }

    if(data.hasRings) {
        const rPts=[], rCols=[];
        const inner=data.r*1.3, outer=data.r*2.5;
        for(let k=0; k<20000; k++){
            const ang=Math.random()*Math.PI*2;
            const rad=Math.sqrt(Math.random()*(outer**2-inner**2)+inner**2);
            if(rad>data.r*1.9 && rad<data.r*2.05) continue;
            rPts.push(Math.cos(ang)*rad, (Math.random()-0.5)*0.15, Math.sin(ang)*rad);
            const rc=new THREE.Color(0xD6BC92); if(rad>data.r*2.1) rc.setHex(0xA89F91); rc.offsetHSL(0,0,(Math.random()-0.5)*0.1);
            rCols.push(rc.r,rc.g,rc.b);
        }
        const rGeo = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(rPts,3)).setAttribute('color', new THREE.Float32BufferAttribute(rCols,3));
        const rMesh = new THREE.Points(rGeo, galaxyMaterial.clone());
        rMesh.rotation.x=0.45; rMesh.material.opacity=0.6; rMesh.material.size=1.4;
        group.add(rMesh);
    }

    const div = document.createElement('div'); div.className='label'; div.textContent=data.name;
    div.onclick = () => focusOn(group, data.r, data.name, div);
    const label = new CSS2DObject(div); label.position.set(0, data.r+3, 0);
    group.add(label);

    const path = new THREE.Line(new THREE.BufferGeometry().setFromPoints(new THREE.EllipseCurve(0,0,data.dist,data.dist,0,2*Math.PI).getPoints(120)), new THREE.LineBasicMaterial({color:0xffffff, opacity:0.05, transparent:true}));
    path.rotation.x = Math.PI/2;
    scene.add(path);

    scene.add(group);
    planetSystems.push({ mesh: group, data: data });
});

// --- BACKGROUND STARS ---
let starMesh;
function createStars() {
    const pts=[]; for(let i=0; i<15000; i++) pts.push((Math.random()-0.5)*150000,(Math.random()-0.5)*150000,(Math.random()-0.5)*150000);
    const geo=new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(pts,3));
    const mat=galaxyMaterial.clone(); 
    mat.size=3; mat.opacity=0.8; mat.color.setHex(0xAADDFF);
    starMesh=new THREE.Points(geo, mat); scene.add(starMesh);
}
createStars();

function focusOn(target, radius, name, labelDiv) {
    document.querySelectorAll('.label').forEach(e => e.classList.remove('active'));
    if(labelDiv) labelDiv.classList.add('active');
    document.getElementById('status').innerText = "TRACKING: " + name;
    controls.autoRotate = false;
    const dist = radius > 0 ? radius * 4.0 + 10 : 100;
    focusTarget = { obj: target, dist: dist };
}

window.resetCamera = function() {
    focusTarget = null;
    document.getElementById('status').innerText = "System Overview";
    document.querySelectorAll('.label').forEach(e => e.classList.remove('active'));
    const s=camera.position.clone(); const e=new THREE.Vector3(0,180,400); let a=0;
    function b(){ a+=0.02; if(a<=1){ camera.position.lerpVectors(s,e,a); controls.target.lerp(new THREE.Vector3(0,0,0),0.05); requestAnimationFrame(b); } else controls.autoRotate=true; }
    b();
}

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

    // Logic hiển thị Galaxy
    if(galaxySystem) {
        galaxySystem.rotation.y = -time * 0.001; // Xoay rất chậm
        // Khi zoom vào gần hệ mặt trời (dưới 3000), làm mờ thiên hà để không rối mắt
        // Khi zoom ra (trên 10000), thiên hà hiện rõ 100%
        const targetOpacity = THREE.MathUtils.clamp((dist - 3000) / 7000, 0.1, 1);
        galaxySystem.material.opacity = targetOpacity * 0.9;
    }

    const labels = document.querySelectorAll('.label');
    if(dist > 7000) { 
        labels.forEach(l => l.classList.add('hidden')); 
        document.getElementById('status').innerText="THE MILKY WAY"; 
    } else { 
        labels.forEach(l => l.classList.remove('hidden')); 
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