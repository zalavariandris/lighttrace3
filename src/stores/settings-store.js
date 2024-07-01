import {produce} from "immer";
import _ from "lodash"

const defaultSettings = {
    debug: true,
    display: {
        shapes: true,
        lights: true,
        rays: false,
        hitSpans: false,
        normals: false,
        paths: true,
        glrays: false,
        glhitspans: false,
        glnormals: false,
        glpaths: true
    },
    raytrace: {
        lightSamples: 128*128,//128*128; //Math.pow(4,4);
        maxBounce: 7,
        targetPasses: 10,
        subsampling: 1
    }
};

let settings;
settings = JSON.parse(localStorage.getItem("settings"));

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

    reset(){
        settings = defaultSettings
        emitChange()
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