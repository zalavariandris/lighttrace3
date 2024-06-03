import {produce} from "immer";
import _ from "lodash"

let stats = {
    renderedPasses: 0
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
        const updatedStats = produce(stats, draft=>{
            _.set(draft, keyPath, value);
        });

        if(stats!=updatedStats){
            stats=updatedStats;
            emitChange();
        }
    },
    incrementPasses(keyPath, value)
    {
        const updatedStats = produce(stats, draft=>{
            draft.renderedPasses=stats.renderedPasses+1;
        });

        if(stats!=updatedStats){
            stats=updatedStats;
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
        return stats;
    }
}