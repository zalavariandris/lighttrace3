import {produce} from "immer";

/*
 * STORE
 */
let scene = {
    "ball": {
        pos: {x: 265.0, y:260.0},
        shape: {type: "circle", radius: 50},
        material: "mirror"
    },
    "ball2": {
        pos: {x: 128.0, y:350.0},
        shape: {type: "circle", radius: 70},
        material: "mirror"
    },
    "ball3": {
        pos: {x: 18.0, y:350.0},
        shape: {type: "circle", radius: 70},
        material: "mirror"
    },
    "light": {
        pos: {x: 216, y: 110},
        light: {type: "point"}
    }
};

let listeners = [];

function emitChange() {
    for (let listener of listeners) {
        listener();
    }
};

export default {
    updateComponent(key, component, newAttributes)
    {
        const updatedScene = produce(scene, draft=>{
            Object.assign(draft[key][component], newAttributes);
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