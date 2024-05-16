import {produce} from "immer";



let scene = {
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
            translate: {x: 195, y: 10},
            rotate: 90.0*Math.PI/180.0
        },
        light: {
            type: "laser",
            temperature: 6500,
            intensity:1.0,
        },
        selected: false
    },
    // "sun": {
    //     transform:{
    //         translate: {x: 195, y: 10},
    //         rotate: 90.0*Math.PI/180.0
    //     },
    //     light: {
    //         type: "directional",
    //         width: 100,
    //         intensity:1.0,
    //         temperature: 6500
    //     },
    //     selected: false
    // },
    "ball": {
        transform:{
            translate: {x: 200, y: 180},
            rotate: 0.0
        },
        shape: {
            type: "circle", 
            radius: 50
        },
        material: {
            type: "mirror"
        },
        selected: false
    },
    // "ball2": {
    //     transform:{
    //         translate: {x: 200, y: 310},
    //         rotate: 0.0
    //     },
    //     shape: {
    //         type: "circle", 
    //         radius: 70
    //     },
    //     material: {
    //         type: "mirror"
    //     },
    //     selected: false
    // },
    // "ball3": {
    //     transform:{
    //         translate: {x: 200, y: 480},
    //         rotate: 0.0
    //     },
    //     shape: {
    //         type: "circle", 
    //         radius: 30
    //     },
    //     material: {
    //         type: "mirror"
    //     },
    //     selected: false
    // },
    "box": {
        transform: {
            translate: {x: 300, y: 60},
            roate: 0
        },
        material: {
            type: "mirror"
        },
        shape: {
            type: "rectangle",
            width: 200,
            height: 200
        }
    },
    // "lens": {
    //     transform: {
    //         translate: {x: 50, y: 100},
    //         rotate: 0
    //     },
    //     material: {
    //         type: "glass"
    //     },
    //     shape: {
    //         type: "sphericalLens",
    //         diameter: 140,
    //         edgeThickness: 5,
    //         centerThickness: 80
    //     }
    // }

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
