import {produce} from "immer";


let scene = {
    "light": {
        transform:{
            translate: {x: 200, y: 10},
            rotate: 0.0
        },
        light: {
            type: "point",
            temperature: 6000
        },
        selected: false
    },
    "ball": {
        transform:{
            translate: {x: 200, y: 180},
            rotate: 0.0
        },
        shape: {
            type: "circle", 
            radius: 50
        },
        material: "mirror",
        selected: false
    },
    "ball2": {
        transform:{
            translate: {x: 200, y: 310},
            rotate: 0.0
        },
        shape: {
            type: "circle", 
            radius: 70
        },
        material: "mirror",
        selected: false
    },
    "ball3": {
        transform:{
            translate: {x: 200, y: 480},
            rotate: 0.0
        },
        shape: {
            type: "circle", 
            radius: 30
        },
        material: "mirror",
        selected: false
    },

};

let listeners = [];

function emitChange() {
    for (let listener of listeners) {
        listener();
    }
};

export default {
    updateComponent(entityKey, component, newAttributes)
    {
        const updatedScene = produce(scene, draft=>{
            // draft[key][component] = _.update(draft[key][component], newAttributes)
            Object.assign(draft[entityKey][component], newAttributes);
        });

        if(scene!=updatedScene){
            scene=updatedScene;
            emitChange();
        }
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