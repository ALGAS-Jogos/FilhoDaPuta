require("utils.noobhub")
require("utils.json")

local naipes = {"clubs","diamonds","hearts","spades"}
local cartas = {"ace",2,3,4,5,6,7,"jack","queen","king"}
local manilhas = {zap={number=4,naipe="clubs",rank=1},setecopa={number=7,naipe="hearts",rank=2},espadilha={number="ace",naipe="spades",rank=3},seteouro={number=7,naipe="diamonds",rank=4}}
local ordem = {{number=3,rank=5},{number=2,rank=6},{number="ace",rank=7},{number="king",rank=8},{number="jack",rank=9},{number="queen",rank=10},{number=7,rank=11},{number=6,rank=12},{number=5,rank=13},{number=4,rank=14},}
local playerCartas = {}
local playerCartasRect = {}
love.math.setRandomSeed(os.time()/2+1)
local rng = love.math.random
local round = 1
local cardback = love.graphics.newImage("cards/xback.png")
local cardSize = 0.18
local cardW,cardH = 500,726
local screenw,screenh = love.graphics.getDimensions()
local fazQuantas = 0

local hub = noobhub.new({server="localhost", port="8181"})
local localId = rng(10000,99999)
local gotEnd = false
local enemiesHand = {}
local players = {}
players[1] = localId
local onStartMenu = true
local waitingPlayers = false
local myTurn = false
local whoTurn = localId
local whoDealer = localId
local betTime = true
local totalBet = 0
local wrongbet = false
local partyId = ""
local totalPlayers = 1

local font = love.graphics.newFont(18)

function love.load()
    addCards()
    --enterGame()
end

function love.update(dt)
    hub:enterFrame()
end

function love.draw()
    if onStartMenu then
        love.graphics.printf("Pressione N para criar uma sala!",font,0,screenh/2,screenw,"center")
        love.graphics.printf("Ou digite aqui o id de uma sala e pressione enter: "..partyId,font,0,screenh/2+25,screenw,"center")
    elseif waitingPlayers then
        love.graphics.printf("ID da sua sala: "..tostring(partyId),font,0,screenh/2,screenw,"center")
        love.graphics.printf("Pessoas na sala: "..tostring(totalPlayers),font,0,screenh/2+25,screenw,"center")
        if partyId==tostring(localId) then 
            love.graphics.printf("Pressione S para iniciar a partida!",font,0,screenh/2+50,screenw,"center") 
        else
            love.graphics.printf("Espere o dono da sala iniciar a partida!",font,0,screenh/2+50,screenw,"center")
        end
        love.graphics.printf("Pressione Esc para sair dessa sala!",font,0,screenh-50,screenw,"center") 
    else
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
            local offset = (screenw - (#value.cards * cardW*cardSize + (#value.cards - 1) * spacing)) / 2
            for i,v in ipairs(value.cards) do
                local drawing = v.img
                if round>1 then drawing=cardback end
                local x = offset + (i - 1) * (cardW*cardSize + spacing)
                love.graphics.draw(drawing,x,0,0,cardSize)
            end
            love.graphics.printf(value.id,font,offset,cardH*cardSize+5,screenw,"left")            
        end
        if whoTurn==localId then 
            if betTime then 
                love.graphics.printf("Faz: "..fazQuantas,font,0,screenh/2,screenw,"center")
                if whoDealer==localId then 
                    love.graphics.printf("Apostas totais: "..totalBet,font,0,screenh/2+20,screenw,"center") 
                    if wrongbet then
                        love.graphics.printf("Sua aposta não pode ser esse valor!",font,0,screenh/2+40,screenw,"center") 
                    end
                end
            end
            love.graphics.printf("Seu turno!",font,0,screenh/2-20,screenw,"center")
        end
    end
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
    local spacing = 5
    local offset = (screenw - (#playerCartas * cardW*cardSize + (#playerCartas - 1) * spacing)) / 2
    if round==1 then
        local x = offset + (0) * (cardW*cardSize + spacing)
        table.insert(playerCartasRect,{x=x,y=screenh-cardH*cardSize,w=cardW*cardSize,h=cardH*cardSize})
    else
        for k,v in ipairs(playerCartas) do
            local x = offset + (k - 1) * (cardW*cardSize + spacing)
            table.insert(playerCartasRect,{x=x,y=screenh-cardH*cardSize,w=cardW*cardSize,h=cardH*cardSize})
        end
    end
end

function love.mousepressed(x,y,btn)
    if btn==1 then
        if betTime==false then
            for i, carta in ipairs(playerCartasRect) do
                if x >= carta.x and x <= carta.x + carta.w and y >= carta.y and y <= carta.y + carta.h then
                    -- Carta clicada!
                    publish("playcard",i)
                    playerCartas[i] = nil
                    playerCartasRect[i] = nil
                    break -- Saia do loop, já que encontramos a carta clicada
                end
            end
        end

    elseif btn==2 then
        publish("newround",1)
        newRound()
    else
        
    end
end

function love.keypressed(key)
    if onStartMenu then
        if key=="backspace" then
            partyId = string.sub(partyId,1,#partyId-1)
        else
            if key=="1" then
                partyId = partyId.."1"
            elseif key=="2" then
                partyId = partyId.."2"
            elseif key=="3" then
                partyId = partyId.."3"
            elseif key=="4" then
                partyId = partyId.."4"
            elseif key=="5" then
                partyId = partyId.."5"
            elseif key=="6" then
                partyId = partyId.."6"
            elseif key=="7" then
                partyId = partyId.."7"
            elseif key=="8" then
                partyId = partyId.."8"
            elseif key=="9" then
                partyId = partyId.."9"
            elseif key=="0" then
                partyId = partyId.."0"
            end
        end
        if key=="return" then
            waitingPlayers=true
            onStartMenu=false
            enterGame(partyId)                        
        end
        if key=="n" then
            waitingPlayers=true
            onStartMenu=false
            enterGame(tostring(localId))
            partyId=tostring(localId)
        end
    elseif waitingPlayers then
        if key=="escape" then
            waitingPlayers=false
            onStartMenu=true
            partyId=""
            leaveGame()
        end
        if key=="s" and partyId==tostring(localId) then
            waitingPlayers=false
            publish("startgame")
            publish("whodealer",localId)
            changeTurn()
            showHand()
            for i,v in ipairs(players) do
                print("player"..i..": "..v)
            end
        end
    elseif betTime then
        if whoDealer==localId and fazQuantas+totalBet==#playerCartas then wrongbet=true end
        if key=="backspace" then
            fazQuantas = fazQuantas-1
            if fazQuantas<0 then fazQuantas=0 end
        elseif key=="return" and wrongbet==false then
            sendBet()
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
                fazQuantas = 0
            end
        end
        wrongbet=false
        if fazQuantas > #playerCartas then fazQuantas=#playerCartas end
        if whoDealer==localId and fazQuantas+totalBet==#playerCartas then wrongbet=true end
    end
end

function newRound()
    round=round+1
    playerCartas={}
    enemiesHand = {}
    addCards()
    showHand()
end

function sendBet()
    publish("bet",fazQuantas)
    if partyId==tostring(localId) then
        changeTurn()
    end
end

function changeTurn()
    publish("whoturn",getNext(players,whoTurn))
    whoTurn=getNext(players,whoTurn)
    print(whoTurn)
    print(whoDealer)
    print(gotEnd)
    if gotEnd==true and whoTurn==getNext(players,whoDealer) then
        if betTime==true then
            publish("bettime",false)
            betTime=false
        else
            publish("newround",1)
            newRound()
            betTime=true
            publish("bettime",true)
        end
        gotEnd=false
    end
    if whoTurn==whoDealer then gotEnd = true end
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
                fazQuantas=0                
            end
            if message.action=="myhand" then
                local temp = json.decode(message.content)
                local temptwo = {}
                for k,v in ipairs(temp) do
                    temptwo[k]={naipe=v.naipe,number=v.number,rank=v.rank,img=love.graphics.newImage(v.img)}
                end
                local obj = {id = message.id,cards = temptwo}
                table.insert(enemiesHand,obj)
            end
            if message.action=="justjoined" then
                totalPlayers=totalPlayers+1
                if message.content==tostring(localId) then
                    publish("updatetotalplayers",totalPlayers)
                    players[#players+1] = message.id
                end
            end
            if message.action=="updatetotalplayers" then
                totalPlayers=message.content
            end
            if message.action=="whoturn" and tostring(message.id)==partyId then
                whoTurn = message.content
            end
            if message.action=="whodealer" and tostring(message.id)==partyId then
                whoDealer = message.content
            end
            if message.action=="startgame" and tostring(message.id)==partyId then
                waitingPlayers=false
                showHand()
            end
            if message.action=="bet" then
                if partyId==tostring(localId) then
                    changeTurn()
                end
                totalBet=totalBet+message.content
            end
            if message.action=="bettime" and tostring(message.id)==partyId then
                betTime=message.content
            end
            if message.action=="playcard" then
                
            end
        end
    })
    publish("justjoined",partyId)
end

function leaveGame()
    hub:unsubscribe()
end

function getNext(list,content)
    local index = nil

    for i = 1, #list do
        if list[i] == content then
            index = i
            break
        end
    end

    if index then
        if index+1>#list then index=0 end
        print("GETNEXT: index: "..(index+1).." size: "..#list)
        return list[index+1]
    else
        return nil -- Item atual não encontrado na lista
    end
end