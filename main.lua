require("utils.noobhub")
require("utils.json")

local naipes = {"clubs","diamonds","hearts","spades"}
local cartas = {"ace",2,3,4,5,6,7,"jack","queen","king"}
local manilhas = {zap={number=4,naipe="clubs",rank=1},setecopa={number=7,naipe="hearts",rank=2},espadilha={number="ace",naipe="spades",rank=3},seteouro={number=7,naipe="diamonds",rank=4}}
local ordem = {{number=3,rank=5},{number=2,rank=6},{number="ace",rank=7},{number="king",rank=8},{number="jack",rank=9},{number="queen",rank=10},{number=7,rank=11},{number=6,rank=12},{number=5,rank=13},{number=4,rank=14},}
local playerCartas = {}
love.math.setRandomSeed(os.time()/2+1)
local rng = love.math.random
local round = 1
local cardback=love.graphics.newImage("cards/xback.png")

local hub = noobhub.new({server="localhost", port="8181"})
local localId=rng(1,99999)

function love.load()
    addCards()
    enterGame(345)
end

function love.update(dt)
    hub:enterFrame()
end

function love.draw()
    if round==1 then
        love.graphics.draw(cardback,0,0,0,0.25)
    else
        for k,v in ipairs(playerCartas) do
            love.graphics.draw(v.img,(k-1)*(500/4+10),0,0,0.25)
        end 
    end
end

function addCards()
    local alreadyThere = {}
    for i=1,round do
        ::reroll::
        local number = cartas[rng(1,#cartas)]
        local naipe = naipes[rng(1,#naipes)]
        for k,v in ipairs(alreadyThere) do
            if v.number==number and v.naipe==naipe then goto reroll end
        end
        alreadyThere[i]={number=number,naipe=naipe}
        playerCartas[i]={number=number,naipe=naipe,img=love.graphics.newImage("cards/"..number.."_of_"..naipe..".png")}
    end
end

function love.mousepressed(btn)
    publish("ping","turning around")
    round=round+1
    playerCartas={}
    addCards()
end

function publish(action,content)    
    hub:publish({
        message = {
            action = action,
            content = content,
            id = localId,
            timestamp = os.time()
        }
    })
    print(action)
end

function enterGame(channel)
    hub:subscribe({
        channel = channel,
        callback = function(message)
            if message.action=="ping" then publish("pong","we made it"..tostring(localId)) end
            if message.action=="pong" then print(message.content) end
        end
    })
end