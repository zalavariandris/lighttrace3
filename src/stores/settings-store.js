import {produce} from "immer";
import _ from "lodash"

const defaultSettings = {
    "display": {
        shapes: true,
        lights: true,
        rays: false,
        normals: false,
        debug: true,
        render: true
    },
    "raytrace": {
        lightSamples: Math.pow(4,5),//128*128; //Math.pow(4,4);
        maxBounce: 7,
        targetPasses: 10,
        downres: 1/2
    }
};

let settings;
// settings = JSON.parse(localStorage.getItem("settings"));

if(!settings)
{
    settings = defaultSettings;
}


let listeners = [];

function emitChange() {
    for (let listener of listeners) {
        listener();
    }
    localStorage.setItem("settings", JSON.stringify(settings));
};

export default {
    setValue(keyPath, value)
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