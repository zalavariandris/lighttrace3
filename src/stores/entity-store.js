import {produce} from "immer";
import _ from "lodash"
import { myrandom } from "../utils.js";
const defaultScene = {
    // "light": {
    //     transform:{
    //         translate: {x: 200, y: 10},
    //         rotate: 0.0
    //     },
    //     light: {
    //         type: "point",
    //         temperature: 6500,
    //         intensity:1.0,
    //     },
    //     selected: false
    // },
    "pointer": {
        transform:{
            translate: {x: 50, y: 180},
            rotate: -3.0*Math.PI/180.0
        },
        light: {
            type: "laser",
            temperature: 6500,
            intensity:3,
        },
        selected: false
    },

    "prism":{
        transform: {
            translate: {x: 250, y:200},
            rotate: 0.0
        },
        shape:{
            type: "triangle",
            size: 70
        },
        material:{
            type: "glass"
        },
        selected: false
    },
    "ball3": {
        transform:{
            translate: {x: 400, y: 201},
            rotate: 0.0
        },
        shape: {
            type: "circle", 
            radius: 30
        },
        material: {
            type: "mirror"
        },
        selected: false
    },
    "ground": {
        transform:{
            translate: {x: 256, y: 450},
            rotate: 0.0
        },
        shape: {
            type: "line", 
            length: 400.0
        },
        material: {
            type: "diffuse"
        },
        selected: false
    },
    // "box": {
    //     transform: {
    //         translate: {x: 370, y: 130},
    //         rotate: 0.1
    //     },
    //     shape: {
    //         type: "rectangle",
    //         width: 200,
    //         height: 200
    //     },
    //     material: {
    //         type: "diffuse"
    //     },
    //     selected: true
    // },
    "lens": {
        transform: {
            translate: {x: 180, y: 120},
            rotate: 0
        },
        shape: {
            type: "sphericalLens",
            diameter: 140,
            edgeThickness: 5,
            centerThickness: 80
        },
        material: {
            type: "glass"
        },
        selected: false
    }
};

const cornelBoxScene = {
    "light":{
        transform:{
            translate: {x: 50, y:100},
            rotate: 0.0
        },
        light: {
            type: "point",
            temperature: 6500,
            intensity:1.0,
        },
        selected: false
    },

    "rectangle":{
        transform:{
            translate: {x: 150,y: 250},
            rotate: 0/180*Math.PI
        },
        shape: {
            type: "rectangle",
            width: 300,
            height: 400
        },
        material: {
            type: "glass"
        },
        selected: false
    },

    "glassball":{
        transform:{
            translate: {x: 230, y: 350},
            rotate: 0
        },
        shape: {
            type: "circle",
            radius: 50
        },
        material: {
            type: "glass"
        },
        selected: false
    },
    
    "mirrorball":{
        transform:{
            translate: {x: 70, y: 350},
            rotate: 0
        },
        shape: {
            type: "circle",
            radius: 50
        },
        material: {
            type: "mirror"
        },
        selected: false
    }
}

const lensesScene = {
    "sun":{
        transform:{
            translate: {x: 50, y: 200},
            rotate: 0/180*Math.PI
        },
        light: {
            type: "directional",
            width: 100,
            temperature: 6500,
            intensity:3,
        },
        selected: false
    },
    "lens": {
        transform: {
            translate: {x: 180, y: 200},
            rotate: 0
        },
        shape: {
            type: "sphericalLens",
            diameter: 140,
            edgeThickness: 20,
            centerThickness: 80
        },
        material: {
            type: "glass"
        },
        selected: false
    },
    "concave": {
        transform: {
            translate: {x: 280, y: 200},
            rotate: 0
        },
        shape: {
            type: "sphericalLens",
            diameter: 140,
            edgeThickness: 80,
            centerThickness: 10
        },
        material: {
            type: "glass"
        },
        selected: false
    }
}

const prismScene = {
    "pointer": {
        transform:{
            translate: {x: 100, y: 210},
            rotate: -0.0*Math.PI/180.0
        },
        light: {
            type: "laser",
            temperature: 6500,
            intensity:3,
        },
        selected: false
    },
    "prism": {
        transform: {
            translate: {x: 230, y: 220},
            rotate: 0
        },
        shape: {
            type: "triangle",
            size: 50
        },
        material: {
            type: "glass"
        },
        selected: false
    }
}

const lightsScene = {
    "laser":{
        transform:{
            translate: {x: 150, y: 200},
            rotate: 90/180*Math.PI
        },
        light: {
            type: "laser",
            temperature: 6500,
            intensity:3,
        },
        selected: false
    },
    "sun":{
        transform:{
            translate: {x: 250, y: 200},
            rotate: 90/180*Math.PI
        },
        light: {
            type: "directional",
            width: 30,
            temperature: 6500,
            intensity:3,
        },
        selected: false
    },
    "light":{
        transform:{
            translate: {x: 350, y: 200},
            rotate: 90/180*Math.PI
        },
        light: {
            type: "point",
            temperature: 6500,
            intensity:1.0,
        },
        selected: false
    },
    "ground": {
        transform:{
            translate: {x: 256, y: 450},
            rotate: 0.0
        },
        shape: {
            type: "line", 
            length: 400.0
        },
        material: {
            type: "diffuse"
        },
        selected: false
    }
}

const shapesScene = {
    "sun":{
        transform:{
            translate: {x: 10, y: 250},
            rotate: 10/180*Math.PI
        },
        light: {
            type: "directional",
            width: 300,
            temperature: 6500,
            intensity:3,
        },
        selected: false
    },
    "ground": {
        transform:{
            translate: {x: 256, y: 450},
            rotate: 0.0
        },
        shape: {
            type: "line", 
            length: 400.0
        },
        material: {
            type: "diffuse"
        },
        selected: false
    },
    "circle":{
        transform:{
            translate: {
                x: 100,
                y: 150
            },
            rotate: 0
        },
        shape: {
            type: "circle",
            radius: 20
        },
        material: {
            type: "glass"
        },
    },
    "rectangle":{
        transform:{
            translate: {x: 100,y: 210},
            rotate: -10/180*Math.PI
        },
        shape: {
            type: "rectangle",
            width: 40,
            height: 40
        },
        material: {
            type: "glass"
        },
        selected: false
    },
    "prism":{
        transform:{
            translate: {x: 100,y: 270},
            rotate: 0
        },
        shape: {
            type: "triangle",
            size: 25,
        },
        material: {
            type: "glass"
        },
        selected: false
    }, 
    "concave lens": {
        transform: {
            translate: {x: 100, y: 320},
            rotate: 0
        },
        shape: {
            type: "sphericalLens",
            diameter: 40,
            edgeThickness: 5,
            centerThickness: 20
        },
        material: {
            type: "glass"
        },
        selected: false
    },
    "convex lens": {
        transform: {
            translate: {x: 100, y: 380},
            rotate: 0
        },
        shape: {
            type: "sphericalLens",
            diameter: 40,
            edgeThickness: 40,
            centerThickness: 20
        },
        material: {
            type: "glass"
        },
        selected: false
    }
}

let scene;
scene = JSON.parse(localStorage.getItem("scene"));
if(!scene)
{
    scene = cornelBoxScene;
}


let listeners = [];

function emitChange() {
    for (let listener of listeners) {
        listener();
    }
    localStorage.setItem("scene", JSON.stringify(scene));
};

const generateId = ()=>{
    return myrandom().toString(32).substring(2, 9);
};

export default {
    loadDefault()
    {
        scene = defaultScene;
        emitChange();
    },

    loadExample(name)
    {
        switch (name) {
            case "lenses":
                scene=lensesScene;
                break;
            case "prism":
                scene=prismScene;
                break;
            case "shapes":
                scene=shapesScene;
                break;
            case "lights":
                scene=lightsScene;
                break;
            case "cornel box":
                scene = cornelBoxScene;
            default:
                break;
        }
        emitChange();
    },

    setValue(path, value){
        const updatedScene = produce(scene, draft=>{
            _.set(draft, path, value);
        });

        if(scene!=updatedScene){
            scene=updatedScene;
            emitChange();
        }
    },

    addEntity(key, entity)
    {
        if(scene.hasOwnProperty(key)){
            throw new Error(`Cannot create entity with existing keys! Scene already conains an entity with the '${key}' ID.`)
        }
        const updatedScene = produce(scene, draft=>{
            draft[key] = entity;
        });

        if(scene!=updatedScene){
            scene=updatedScene;
            emitChange();
        }
    },

    removeEntities(keys)
    {
        const updatedScene = Object.fromEntries(Object.entries(scene).filter(([key, entity])=>keys.indexOf(key)<0));
        if(scene!=updatedScene){
            scene=updatedScene;
            emitChange();
        }
    },

    setSelection(newSelectionKeys){
        const updatedScene = produce(scene, draft=>{
            for(let entityKey in scene){
                draft[entityKey].selected = newSelectionKeys.indexOf(entityKey)>=0;
            }
        });

        if(scene!=updatedScene){
            scene=updatedScene;
            emitChange();
        }
    },

    getSelection()
    {
       return Object.fromEntries(Object.entries(scene).filter( ([key, entity])=>entity.selected));
    },

    subscribe(listener) 
    {
        listeners = [...listeners, listener];
        return () => {
            listeners = listeners.filter(l => l !== listener);
        };
    },

    getSnapshot() {
        return scene;
    }
}
