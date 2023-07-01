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
local cardback = love.graphics.newImage("cards/xback.png")
local cardSize = 0.18
local cardW,cardH = 500,726
local fazQuantas = 0

local hub = noobhub.new({server="localhost", port="8181"})
local localId = rng(1,99999)
local enemiesHand = {}

local font = love.graphics.newFont(18)

function love.load()
    addCards()
    --lookForGame()
    enterGame(777)
end

function love.update(dt)
    hub:enterFrame()
end

function love.draw()
    local screenw,screenh = love.graphics.getDimensions()
    local spacing = 5
    local offset = (screenw - (#playerCartas * cardW*cardSize + (#playerCartas - 1) * spacing)) / 2
    if round==1 then
        local x = offset + (0) * (cardW*cardSize + spacing)
        love.graphics.draw(cardback,x,screenh-cardH*cardSize,0,cardSize)
    else
        for k,v in ipairs(playerCartas) do
            local x = offset + (k - 1) * (cardW*cardSize + spacing)
            love.graphics.draw(v.img,x,screenh-cardH*cardSize,0,cardSize)
        end
    end
    for k,value in ipairs(enemiesHand) do
        for i,v in ipairs(value) do
            local drawing = v.img
            if round>1 then drawing=cardback end
            local offset = (screenw - (#value * cardW*cardSize + (#value - 1) * spacing)) / 2
            local x = offset + (i - 1) * (cardW*cardSize + spacing)
            love.graphics.draw(drawing,x,0,0,cardSize)
        end
    end
    love.graphics.printf("Faz: "..fazQuantas,font,0,screenh/2,screenw,"center")
end

function addCards()
    local alreadyThere = {}
    local totalCards = round
    if round>7 then
        totalCards=7
    end
    for i=1,totalCards do
        ::reroll::
        local number = cartas[rng(1,#cartas)]
        local naipe = naipes[rng(1,#naipes)]
        for k,v in ipairs(alreadyThere) do
            if v.number==number and v.naipe==naipe then goto reroll end
        end
        local rank = 0
        for k,v in pairs(manilhas) do
            if number==v.number and naipe==v.naipe then rank=v.rank end
        end
        if rank==0 then
            for k,v in ipairs(ordem) do
                if number==v.number then rank=v.rank end
            end
        end
        alreadyThere[i]={number=number,naipe=naipe}
        playerCartas[i]={number=number,naipe=naipe,rank=rank,img=love.graphics.newImage("cards/"..number.."_of_"..naipe..".png")}
    end
end

function love.mousepressed(x,y,btn)
    if btn==1 then

    elseif btn==2 then
        publish("newround",1)
        newRound()
    else
        
    end
end

function love.keypressed(key)
    if key=="backspace" then
        fazQuantas = fazQuantas-1
        if fazQuantas<0 then fazQuantas=0 end
    else
        if key=="1" then
            fazQuantas = 1
        elseif key=="2" then
            fazQuantas = 2
        elseif key=="3" then
            fazQuantas = 3
        elseif key=="4" then
            fazQuantas = 4
        elseif key=="5" then
            fazQuantas = 5
        elseif key=="6" then
            fazQuantas = 6
        elseif key=="7" then
            fazQuantas = 7
        elseif key=="0" then
            fazQuantas=0
        end
    end
    if fazQuantas > #playerCartas then fazQuantas=#playerCartas end
end

function newRound()
    round=round+1
    playerCartas={}
    addCards()
    showHand()
end

function showHand()
    local temp = {}
    for k,v in ipairs(playerCartas) do
        temp[k]={number=v.number,naipe=v.naipe,rank=v.rank,img="cards/"..v.number.."_of_"..v.naipe..".png"}
    end
    publish("myhand",json.encode(temp))
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
            if message.action=="newround" then
                newRound()
            end
            if message.action=="myhand" then
                local temp = json.decode(message.content)
                local temptwo = {}
                for k,v in ipairs(temp) do
                    temptwo[k]={naipe=v.naipe,number=v.number,rank=v.rank,img=love.graphics.newImage(v.img)}
                end
                table.insert(enemiesHand,temptwo)
            end
            if message.action=="justjoined" then
                showHand()
                publish("sendhand",message.id)
            end
            if message.action=="sendhand" and message.content==localId then
                showHand()
            end
        end
    })
    publish("justjoined",nil)
end

function lookForGame()
    hub:subscribe({
        channel = "queue",
        callback = function(message)
            if message.action=="newround" then
                newRound()
            end
            if message.action=="myhand" then
                local temp = json.decode(message.content)
                local temptwo = {}
                for k,v in ipairs(temp) do
                    temptwo[k]={naipe=v.naipe,number=v.number,rank=v.rank,img=love.graphics.newImage(v.img)}
                end
                enemyHand=temptwo
            end
            if message.action=="justjoined" then
                showHand()
                publish("sendhand",message.id)
            end
            if message.action=="sendhand" and message.content==localId then
                showHand()
            end
        end
    })
end