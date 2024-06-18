import entityStore from "../stores/entity-store.js"
import uiStore from "../stores/ui-store.js";

// shapes
// import Circle from "../scene/shapes/Circle.js"
// import Rectangle from "../scene/shapes/Rectangle.js"
// import SphericalLens from "../scene/shapes/SphericalLens.js"
// import LineSegment from "../scene/shapes/LineSegment.js"

// // ligths
// import PointLight from "../scene/lights/PointLight.js";
// import DirectionalLight from "../scene/lights/DirectionalLight.js";
// import LaserLight from "../scene/lights/LaserLight.js";

function cursorPoint(svg, {x, y}){
    let pt = svg.createSVGPoint();
    pt.x =x; pt.y = y;
    const scenePoint = pt.matrixTransform(svg.getScreenCTM().inverse());
    return {x:scenePoint.x, y:scenePoint.y};
}

function generateUniqueName(name_request, all_names) {
    let baseName = name_request;
    let counter = 1;
    let newName = `${baseName}_${String(counter).padStart(3, '0')}`;

    while (all_names.includes(newName)) {
        counter++;
        newName = `${baseName}_${String(counter).padStart(3, '0')}`;
    }

    return newName;
}

const selectAndMoveTool = e => {

}

const circleTool = e => {
    e.preventDefault();
    var svg  = e.target.closest("SVG");
    let loc = cursorPoint(svg, {x: e.clientX, y:e.clientY});

    const [beginSceneX, beginSceneY] = [loc.x, loc.y];

    // create circle
    const key = generateUniqueName("circle", Object.keys(entityStore.getSnapshot()));
    entityStore.addEntity(key, {
        transform:{
            translate: {
                x: beginSceneX,
                y: beginSceneY
            },
            rotate: 0
        },
        shape: {
            type: "circle",
            radius: 5
        },
        material: {
            type: "glass"
        },
        selected: false
    });

    const handleDrag = e=>{
        // var svg  = e.target.closest("SVG");
        let loc = cursorPoint(svg, {x: e.clientX, y:e.clientY});
        const [sceneX, sceneY] = [loc.x, loc.y]
        const [dx, dy] = [sceneX-beginSceneX, sceneY-beginSceneY];

        entityStore.setValue(`${key}.shape.radius`, Math.hypot(dx, dy));
    }

    window.addEventListener("mousemove", handleDrag);
    window.addEventListener("mouseup", e=>{
        window.removeEventListener("mousemove", handleDrag);
        uiStore.setValue("activeMouseTool", null);
    }, {once: true});
};

const rectangleTool = e => {
    e.preventDefault();
    var svg  = e.target.closest("SVG");
    let loc = cursorPoint(svg, {x: e.clientX, y:e.clientY});
    const [beginSceneX, beginSceneY] = [loc.x, loc.y];

    const key = generateUniqueName("rectangle", Object.keys(entityStore.getSnapshot()));
    entityStore.addEntity(key, {
        transform:{
            translate: {
                x: beginSceneX,
                y: beginSceneY
            },
            rotate: 0
        },
        shape: {
            type: "rectangle",
            width: 5,
            height: 5
        },
        material: {
            type: "diffuse"
        },
        selected: false
    });

    const handleDrag = e=>{
        // var svg  = e.target.closest("SVG");
        let loc = cursorPoint(svg, {x: e.clientX, y:e.clientY});
        const [sceneX, sceneY] = [loc.x, loc.y]
        const [dx, dy] = [sceneX-beginSceneX, sceneY-beginSceneY];

        entityStore.setValue(`${key}.shape.width`, Math.abs(dx)*2);
        entityStore.setValue(`${key}.shape.height`, Math.abs(dy)*2);

    }

    window.addEventListener("mousemove", handleDrag);
    window.addEventListener("mouseup", e=>{
        window.removeEventListener("mousemove", handleDrag);
        uiStore.setValue("activeMouseTool", null);
    }, {once: true});
}

const triangleTool = e => {
    e.preventDefault();
    var svg  = e.target.closest("SVG");
    let loc = cursorPoint(svg, {x: e.clientX, y:e.clientY});
    const [beginSceneX, beginSceneY] = [loc.x, loc.y];

    const key = generateUniqueName("triangle", Object.keys(entityStore.getSnapshot()));
    entityStore.addEntity(key, {
        transform:{
            translate: {
                x: beginSceneX,
                y: beginSceneY
            },
            rotate: 0
        },
        shape: {
            type: "triangle",
            size: 5,
        },
        material: {
            type: "diffuse"
        },
        selected: false
    });

    const handleDrag = e=>{
        // var svg  = e.target.closest("SVG");
        let loc = cursorPoint(svg, {x: e.clientX, y:e.clientY});
        const [sceneX, sceneY] = [loc.x, loc.y]
        const [dx, dy] = [sceneX-beginSceneX, sceneY-beginSceneY];

        entityStore.setValue(`${key}.shape.size`, Math.hypot(dx, dy));

    }

    window.addEventListener("mousemove", handleDrag);
    window.addEventListener("mouseup", e=>{
        window.removeEventListener("mousemove", handleDrag);
        uiStore.setValue("activeMouseTool", null);
    }, {once: true});
}

const lineTool = e => {
    e.preventDefault();
    var svg  = e.target.closest("SVG");
    let loc = cursorPoint(svg, {x: e.clientX, y:e.clientY});
    const [beginSceneX, beginSceneY] = [loc.x, loc.y];

    const entityKey = generateUniqueName("line", Object.keys(entityStore.getSnapshot()));
    entityStore.addEntity(entityKey, {
        transform:{
            translate: {x: beginSceneX, y: beginSceneY},
            rotate: 0.0
        },
        shape: {
            type: "line", 
            length: 5.0
        },
        material: {
            type: "diffuse"
        },
        selected: false
    });

    const handleDrag = e=>{
        // var svg  = e.target.closest("SVG");
        let loc = cursorPoint(svg, {x: e.clientX, y:e.clientY});
        const [sceneX, sceneY] = [loc.x, loc.y];
        const [x1, y1] = [beginSceneX, beginSceneY];

        entityStore.setValue(`${entityKey}.transform`, {
            translate: {
                x: (x1+sceneX)/2, 
                y: (y1+sceneY)/2
            },
            rotate: Math.atan2(sceneY-y1, sceneX-x1)
        });

        entityStore.setValue(`${entityKey}.shape.length`, Math.hypot(sceneX-x1, sceneY-y1));
    }

    window.addEventListener("mousemove", handleDrag);
    window.addEventListener("mouseup", e=>{
        window.removeEventListener("mousemove", handleDrag);
        uiStore.setValue("activeMouseTool", null);
    }, {once: true});
}

const lensTool = e => {
    e.preventDefault();
    var svg  = e.target.closest("SVG");
    let loc = cursorPoint(svg, {x: e.clientX, y:e.clientY});
    const [beginSceneX, beginSceneY] = [loc.x, loc.y];

    const entityKey = generateUniqueName("lens", Object.keys(entityStore.getSnapshot()));
    entityStore.addEntity(entityKey, {
        transform: {
            translate: {x: beginSceneX, y: beginSceneY},
            rotate: 0
        },
        shape: {
            type: "sphericalLens",
            diameter: 20,
            edgeThickness: 0,
            centerThickness: 5
        },
        material: {
            type: "glass"
        },
        selected: false
    });

    const handleDrag = e=>{
        // var svg  = e.target.closest("SVG");
        let loc = cursorPoint(svg, {x: e.clientX, y:e.clientY});
        const [sceneX, sceneY] = [loc.x, loc.y]
        const [dx, dy] = [sceneX-beginSceneX, sceneY-beginSceneY];

        entityStore.setValue(`${entityKey}.shape.diameter`, Math.abs(dy*2));
        entityStore.setValue(`${entityKey}.shape.edgeThickness`, dx>0 ?    Math.abs(dx*2)*0.1 : Math.abs(dx*2));
        entityStore.setValue(`${entityKey}.shape.centerThickness`, dx>0 ? Math.abs(dx*2) : Math.abs(dx*2)*0.1);

    }

    window.addEventListener("mousemove", handleDrag);
    window.addEventListener("mouseup", e=>{
        window.removeEventListener("mousemove", handleDrag);
        uiStore.setValue("activeMouseTool", null);
    }, {once: true});
}

const pointlightTool = e => {
    e.preventDefault();
    var svg  = e.target.closest("SVG");
    let loc = cursorPoint(svg, {x: e.clientX, y:e.clientY});
    const [beginSceneX, beginSceneY] = [loc.x, loc.y];

    const entityKey = generateUniqueName("pointlight", Object.keys(entityStore.getSnapshot()));
    entityStore.addEntity(entityKey, {
        transform:{
            translate: {x: beginSceneX, y: beginSceneY},
            rotate: 0.0
        },
        light: {
            type: "point",
            temperature: 6500,
            intensity:1.0,
        },
        selected: false
    });

    const handleDrag = e=>{
        // var svg  = e.target.closest("SVG");
        let loc = cursorPoint(svg, {x: e.clientX, y:e.clientY});
        const [sceneX, sceneY] = [loc.x, loc.y]
        const [dx, dy] = [sceneX-beginSceneX, sceneY-beginSceneY];

        entityStore.setValue(`${entityKey}.transform.rotate`, Math.atan2(dy, dx))

    }

    window.addEventListener("mousemove", handleDrag);
    window.addEventListener("mouseup", e=>{
        window.removeEventListener("mousemove", handleDrag);
        uiStore.setValue("activeMouseTool", null);
    }, {once: true});
}

const directionalLightTool = e => {
    e.preventDefault();
    var svg  = e.target.closest("SVG");
    let loc = cursorPoint(svg, {x: e.clientX, y:e.clientY});
    const [beginSceneX, beginSceneY] = [loc.x, loc.y];
    
    const key = generateUniqueName("directionalLight", Object.keys(entityStore.getSnapshot()));
    entityStore.addEntity(key, {
        transform:{
            translate: {x: beginSceneX, y: beginSceneY},
            rotate: 0
        },
        light: {
            type: "directional",
            width: 30,
            temperature: 6500,
            intensity:3,
        },
        selected: false
    });

    const handleDrag = e=>{
        // var svg  = e.target.closest("SVG");
        let loc = cursorPoint(svg, {x: e.clientX, y:e.clientY});
        const [sceneX, sceneY] = [loc.x, loc.y]
        const [dx, dy] = [sceneX-beginSceneX, sceneY-beginSceneY];

        entityStore.setValue(`${key}.transform.rotate`, Math.atan2(dy, dx));
        entityStore.setValue(`${key}.light.width`, Math.hypot(dx, dy)/2);
    }

    window.addEventListener("mousemove", handleDrag);
    window.addEventListener("mouseup", e=>{
        window.removeEventListener("mousemove", handleDrag);
        uiStore.setValue("activeMouseTool", null);
    }, {once: true});
}

const laserTool = e => {
    e.preventDefault();
    var svg  = e.target.closest("SVG");
    let loc = cursorPoint(svg, {x: e.clientX, y:e.clientY});
    const [beginSceneX, beginSceneY] = [loc.x, loc.y];

    const entityKey = generateUniqueName("laser", Object.keys(entityStore.getSnapshot()));
    entityStore.addEntity(entityKey, {
        transform:{
            translate: {x: beginSceneX, y: beginSceneY},
            rotate: 0
        },
        light: {
            type: "laser",
            temperature: 6500,
            intensity:3,
        },
        selected: false
    });


    const handleDrag = e=>{
        // var svg  = e.target.closest("SVG");
        let loc = cursorPoint(svg, {x: e.clientX, y:e.clientY});
        const [sceneX, sceneY] = [loc.x, loc.y]
        const [dx, dy] = [sceneX-beginSceneX, sceneY-beginSceneY];
        
        entityStore.setValue(`${entityKey}.transform.rotate`, Math.atan2(dy, dx));

    }

    window.addEventListener("mousemove", handleDrag);
    window.addEventListener("mouseup", e=>{
        window.removeEventListener("mousemove", handleDrag);
        uiStore.setValue("activeMouseTool", null);
    }, {once: true});
}



export {
    selectAndMoveTool, 
    circleTool, rectangleTool, triangleTool, lineTool, lensTool, 
    pointlightTool, directionalLightTool, laserTool
};