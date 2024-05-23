import {produce} from "immer";
import _ from "lodash"

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

let scene = JSON.parse(localStorage.getItem("scene"));
if(!localStorage.getItem("scene"))
{
    scene = defaultScene;
}


let listeners = [];

function emitChange() {
    for (let listener of listeners) {
        listener();
    }
    localStorage.setItem("scene", JSON.stringify(scene));
};

const generateId = ()=>{
    return Math.random().toString(32).substring(2, 9);
};

export default {
    loadDefault()
    {
        scene = defaultScene;
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
