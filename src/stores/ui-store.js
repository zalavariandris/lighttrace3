import {produce} from "immer";
import _ from "lodash"

let uiState = {
    "activeMouseTool": null,
    "page": "default", // default | settings (the toolbar)
};

let listeners = [];

function emitChange() {
    for (let listener of listeners) {
        listener();
    }
};

export default {
    setValue(keyPath, value)
    {
        const updatedUIState = produce(uiState, draft=>{
            _.set(draft, keyPath, value);
        });

        if(uiState!=updatedUIState){
            uiState=updatedUIState;
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
        return uiState;
    }
}