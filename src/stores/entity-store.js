// @flow

import {produce} from "immer";
import _ from "lodash"
import { myrandom } from "../utils.js";


/* ******************** *
 * TRANSFORM COMPONENTS *
 * ******************** */
function makeTransform(x=0.0,y=0.0,rotate=0.0){
    return {
        translate: {x,y},
        rotate: rotate
    };
}

/* **************** *
 * SHAPE COMPONENTS *
 * **************** */
function makeRectangle(width=40, height=40) {
    return {
        type: "rectangle",
        width: width,
        height: height
    };
}

function makeCircle(radius=10) {
    return {
        type: "circle",
        radius: radius
    };
}

function makeSphericalLens(diameter=40, edgeThickness=5, centerThickness=20) {
    return {
        type: "sphericalLens",
        diameter: diameter,
        edgeThickness: edgeThickness,
        centerThickness: centerThickness
    };
}

function makeTriangle(size=10){
    return {
        type: "triangle",
        size: size
    }
}

function makeLineSegment(length=400.0) {
    return {
        type: "line",
        length: length
    };
}

/* ******************* *
 * MATERIAL COMPONENTS *
 * ******************* */

function makeGlass(ior=1.44, dispersion=0.02){
    return {
        type: "glass",
        ior: ior,
        dispersion: dispersion
    };
}

function makeDiffuse(){
    return {
        type: "diffuse"
    };
}

function makeMirror(){
    return {
        type: "mirror"
    };
}

/* **************** *
 * LIGHT COMPONENTS *
 * **************** */
function makePointLight(temperature=6500, intensity=1.0) {
    return {
        type: "point",
        temperature: temperature,
        intensity: intensity
    };
}

function makeDirectionalLight(temperature=6500, intensity=3, width=300) {
    return {
        type: "directional",
        width: width,
        temperature: temperature,
        intensity: intensity
    };
}

function makeLaserLight(temperature=6500, intensity=3) {
    return {
        type: "laser",
        temperature: temperature,
        intensity: intensity
    };
}

/* *************** *
 * TEMPLATE SCENES *
 * *************** */
const defaultScene = {
    "pointer": {
        transform: makeTransform(50, 180, -3.0*Math.PI/180.0),
        light: makeLaserLight(6500, 3),
        selected: false
    },

    "prism":{
        transform: makeTransform(250, 200, 0.0),
        shape: makeTriangle(70),
        material: makeGlass(1.44, 0.02),
        selected: false
    },
    "ball3": {
        transform: makeTransform(400, 201, 0.0),
        shape: makeCircle(30),
        material: makeMirror(),
        selected: false
    },
    "ground": {
        transform: makeTransform(256, 450, 0.0),
        shape: makeLineSegment(400.0),
        material: makeDiffuse(),
        selected: false
    },
    "lens": {
        transform: makeTransform(180, 120, 0),
        shape: makeSphericalLens(140, 5, 80),
        material: makeGlass(1.44, 0.02),
        selected: false
    }
};

const cornelBoxScene = {
    "light":{
        transform: makeTransform(50, 100, 0.0),
        light: makePointLight(6500, 1.0),
        selected: false
    },

    "rectangle":{
        transform: makeTransform(150, 250, 0),
        shape: makeRectangle(300, 400),
        material: makeGlass(1.44, 0.02),
        selected: false
    },

    "glassball":{
        transform: makeTransform(230, 350, 0),
        shape: makeCircle(50),
        material: makeGlass(1.44, 0.02),
        selected: false
    },
    
    "mirrorball":{
        transform: makeTransform(70, 350, 0),
        shape: makeCircle(50),
        material: makeMirror(),
        selected: false
    }
}

const lensesScene = {
    "sun":{
        transform: makeTransform(50, 200, 0),
        light: makeDirectionalLight(6500, 3, 100),
        selected: false
    },
    "lens": {
        transform: makeTransform(180, 200, 0),
        shape: makeSphericalLens(140, 20, 80),
        material: makeGlass(1.44, 0.02),
        selected: false
    },
    "concave": {
        transform: makeTransform(280, 200, 0),
        shape: makeSphericalLens(140, 80, 10),
        material: makeGlass(1.44, 0.02),
        selected: false
    }
}


const prismScene = {
    "pointer": {
        transform: makeTransform(100, 230, -15.0*Math.PI/180.0),
        light: makeLaserLight(6500, 3),
        selected: false
    },
    "prism": {
        transform: makeTransform(230, 220, 0),
        shape: makeTriangle(50),
        material: makeGlass(1.44, 0.02),
        selected: false
    }
}

const lightsScene = {
    "laser":{
        transform: makeTransform(150, 200, 90/180*Math.PI),
        light: makeLaserLight(6500, 3),
        selected: false
    },
    "sun":{
        transform: makeTransform(250, 200, 90/180*Math.PI),
        light: makeDirectionalLight(6500, 3, 30),
        selected: false
    },
    "light":{
        transform: makeTransform(350, 200, 90/180*Math.PI),
        light: makePointLight(6500, 1.0),
        selected: false
    },
    "ground": {
        transform: makeTransform(256, 450, 0.0),
        shape: makeLineSegment(400.0),
        material: makeDiffuse(),
        selected: false
    }
}
const shapesScene = {
    "sun":{
        transform: makeTransform(10, 250, 10/180*Math.PI),
        light: makeDirectionalLight(6500, 3, 300),
        selected: false
    },
    "ground": {
        transform: makeTransform(256, 450, 0.0),
        shape: makeLineSegment(400.0),
        material: makeDiffuse(),
        selected: false
    },
    "circle":{
        transform: makeTransform(100, 150, 0),
        shape: makeCircle(20),
        material: makeGlass(),
    },
    "rectangle":{
        transform: makeTransform(100, 210, -10/180*Math.PI),
        shape: makeRectangle(40, 40),
        material: makeGlass(),
        selected: false
    },
    "prism":{
        transform: makeTransform(100, 270, 0),
        shape: makeTriangle(25),
        material: makeGlass(),
        selected: false
    }, 
    "concave lens": {
        transform: makeTransform(100, 320, 0),
        shape: makeSphericalLens(40, 5, 20),
        material: makeGlass(),
        selected: false
    },
    "convex lens": {
        transform: makeTransform(100, 380, 0),
        shape: makeSphericalLens(40, 40, 20),
        material: makeGlass(),
        selected: false
    }
}

/* ************ *
 * ENTITY STORE *
 * *****    ******* */
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

export {makeTransform};
export {makeCircle, makeRectangle, makeTriangle, makeSphericalLens, makeLineSegment};
export {makeMirror, makeGlass, makeDiffuse};
export {makePointLight, makeDirectionalLight, makeLaserLight};