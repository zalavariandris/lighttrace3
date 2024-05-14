import {produce} from "immer";
import _ from "lodash";

let settings = {
    "svgDisplay": {
        shapes: true,
        rays: false,
    },
    "glDisplay": {
        normals: true
    }
};

let listeners = [];

function emitChange() {
    for (let listener of listeners) {
        listener();
    }
};

export default {
    update(keyPath, value)
    {
        const updatedSettings = produce(settings, draft=>{
            _.set(draft, keyPath, value);
        });

        if(settings!=updatedSettings){
            settings=updatedSettings;
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
        return settings;
    }
}