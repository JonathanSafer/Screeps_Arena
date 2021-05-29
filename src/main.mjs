import * as constants from '/game/constants';
import {getObjectsByPrototype, getTime, getDirection, getDistance} from '/game'
import {StructureSpawn, Creep} from "/game/prototypes"

let myCreeps, enemyCreeps, spawn, enemySpawn
const memory = {}

for (let globalKey in constants) {
    global[globalKey] = constants[globalKey]
}


export function loop() {
    if(getTime() == 1){
        //TODO init function or file
        spawn = getObjectsByPrototype(StructureSpawn).filter(i => i.my)[0]
        enemySpawn = getObjectsByPrototype(StructureSpawn).filter(i => !i.my)[0]
        console.log(spawn)
    }
    spawn.spawnCreep([MOVE, ATTACK])
    myCreeps = getObjectsByPrototype(Creep).filter(i => i.my)
    for(let i = 0; i < myCreeps.length; i++){
        runCreep(myCreeps[i])
    }
}

function runCreep(creep){
    creep.moveTo(enemySpawn)
    creep.attack(enemySpawn)
}
