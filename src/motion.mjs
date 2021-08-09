//pathFinder based on screeps newMove
//things to import/replace: roomPos.isEqualTo, getTime(), constants, getDirectionTo, moveByPath, searchPath, CostMatrix

const creepCost = 50

const creepCache = {}
const matrixCache = {}
const m = {
    newMove: function(creep, endPos, range = 0){
        const ccache = m.getCreepCache(creep)
        const pathVerified = m.checkPath(creep, endPos, ccache)
        const moveFailed = (ccache.lastPos 
            && ccache.lastPos.isEqualTo(creep.pos) 
            && ccache.lastMove 
            && ccache.lastMove == getTime() - 1)
        //if everything is good to go, MBP
        if(pathVerified && !moveFailed){ 
            const result = creep.moveByPath(ccache.path)
            if(result == OK){
                ccache.lastMove = getTime()
                ccache.lastPos = creep.pos
            }
            if([OK, ERR_TIRED, ERR_BUSY, ERR_NO_BODYPART].includes(result)){//MBP returns OK, OR a different error that we don't mind (like ERR_TIRED)
                return result
            }
        }
        if(ccache.pathFail > 2){
            if(getTime() % 50 != 0){
                return
            }
            ccache.pathFail = 0 
        }
        const pathFound = m.getPath(creep, endPos, range, ccache)
        if(pathFound){
            if(creep.moveByPath(ccache.path) == OK){
                ccache.lastMove = getTime()
                ccache.lastPos = creep.pos
                const nextPos = ccache.path[0]
                if(Game.rooms[nextPos.roomName]){
                    const creeps = nextPos.lookFor(LOOK_CREEPS)
                    if(creeps.length && creeps[0].my){
                        const scache = m.getCreepCache(creeps[0])
                        if(!scache.lastMove || scache.lastMove < (getTime() - 1)){
                            creeps[0].move(creeps[0].pos.getDirectionTo(creep.pos))
                        }
                    }
                }

            }
        } else {
            console.log(`Pathing failure at ${creep.pos}`)
            if(ccache.pathFail){
                ccache.pathFail++
                return
            }
            ccache.pathFail = 1
        }
    },

    moveByPath: function(creep, path){
        
    },

    getCreepCache: function(creep){
        if(!creepCache[creep.id])
            creepCache[creep.id] = {}
        return creepCache[creep.id]
    },

    moveSpeed: function(creep){
        let bodySize = creep.body.length
        const moves = creep.getActiveBodyparts(MOVE)
        const carries = creep.body.filter(part => part == CARRY).length//can't use getActive bc inactive carry parts need to be weightless
        const usedCarries = Math.ceil(creep.store.getUsedCapacity() / CARRY_CAPACITY)//used carries have weight
        const fatigues = bodySize - moves - carries + usedCarries
        return Math.max(fatigues, 0.001)/Math.max(moves, 0.001)
    },

    getMatrix: function(){
        //marks unwalkable squares due to structures, cSites, and enemy creeps
        //roads are treated according to moveSpeed
        //friendly creeps that were moving the prior tick are considered walkable (ignored)
        //stationary friendly creeps are marked expensive (probably 50, should be a setting)
        //updated on first call each tick
        if(matrixCache.lastUpdate != getTime()){
            m.generateMatrix()
        }
        return matrixCache.matrix
    },

    generateMatrix: function(){
        const matrix = new CostMatrix
        const structures = getObjectsByPrototype(Structure)
        const creeps = getObjectsByPrototype(Creep)
        const cSites = getObjectsByPrototype(ConstructionSite)
        for(let i = 0; i < cSites.length; i++){
            matrix.set(cSites[i].x,cSites[i].y, 255)
        }
        for(let i = 0; i < structures.length; i++){
            if(OBSTACLE_OBJECT_TYPES[structures[i].structureType] 
                || (structures[i].structureType == STRUCTURE_RAMPART && !structures[i].my)){
                matrix.set(structures[i].x,structures[i].y, 255)
            } else if(structures[i].structureType == STRUCTURE_ROAD){
                matrix.set(structures[i].x,structures[i].y, Math.ceil(moveSpeed/2))
            }
        }
        for(let i = 0; i < creeps.length; i++){
            if(!creeps[i].my){
                matrix.set(creeps[i].x,creeps[i].y, 255)
            } else {
                const ccache = m.getCreepCache(creeps[i])
                if(!(ccache.lastMove >= getTime() - 1)){
                    matrix.set(creeps[i].x,creeps[i].y, creepCost)
                }
            }
        }
    },

    getPath: function(creep, endPos, range, ccache){
        const moveSpeed = m.moveSpeed(creep)
        const matrix = m.getMatrix(moveSpeed)


        const result = searchPath({x: creep.x, y: creep.y}, {pos: endPos, range: range}, {
            plainCost: Math.ceil(moveSpeed),
            swampCost: Math.ceil(moveSpeed * 5),
            maxOps: 10000,
            costMatrix: matrix
        })
        return result
    }
}
