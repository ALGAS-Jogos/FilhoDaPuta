require("utils.noobhub")
require("utils.json")
local utf8 = require("utf8")

love.graphics.setDefaultFilter("linear")

local naipes = {"clubs","diamonds","hearts","spades"}
local cartas = {"ace",2,3,4,5,6,7,"jack","queen","king"}
local manilhas = {zap={number=4,naipe="clubs",rank=1},setecopa={number=7,naipe="hearts",rank=2},espadilha={number="ace",naipe="spades",rank=3},seteouro={number=7,naipe="diamonds",rank=4}}
local ordem = {{number=3,rank=5},{number=2,rank=6},{number="ace",rank=7},{number="king",rank=8},{number="jack",rank=9},{number="queen",rank=10},{number=7,rank=11},{number=6,rank=12},{number=5,rank=13},{number=4,rank=14},}
local playerCartas = {}
local playerCartasRect = {}
love.math.setRandomSeed(os.time()/2+1)
local rng = love.math.random
local round = 0
local passedRounds = 1
local roundsWon = 0
local roundBet = 0
local vidas = 3 --CHANGE THIS LATER ON
local cardback = love.graphics.newImage("cards/xback.png")
local cardSize = 0.15
local cardW,cardH = 500,726
local screenw,screenh = 0,0
local fazQuantas = 0

local system = love.system.getOS()
                                --187.73.30.41"
--local hub = noobhub.new({server="localhost", port="8181"})
local hub = noobhub.new({server="187.73.30.41", port="8181"})
local localId = rng(10000,99999)
local localName = ""
local gotEnd = false
local enemiesHand = {}
local enemiesBets = {}
local playedCards = {}
local whoPlayed = 0
local whoConfirmed = 0
local players = {}
local drawingPlayers = {}
local namePlayers = {}
players[1] = localId
local onNameMenu = true
local onStartMenu = false
local waitingPlayers = false
local myTurn = false
local whoTurn = localId
local whoDealer = localId
local betTime = true
local confirmTime = false
local clearConfirm = false
local gameOver = false
local nameWon = ""
local totalBet = 0
local wrongbet = false
local partyId = ""
local gameWinner = ""
local totalPlayers = 1
local spacing = 5
local enemySpacing = -50
local androidSpacing = 0
local androidKeyboard = 0

local imdead=false

local bgc={0.05,0.05,0.25}

local font = love.graphics.newFont(18)
local keyboardImage = love.graphics.newImage("imgs/newkeyboard.png")

function love.load()
    if system~="Android" then love.window.setFullscreen(true) end
    screenw,screenh = love.graphics.getDimensions()
    --enterGame()
    if system=="Android" then
        androidSpacing=screenw*0.75 
        cardSize=0.13
    end
end

function love.update(dt)
    hub:enterFrame()
    if partyId==tostring(localId) then
        if betTime==false then
            checkHowManyPlayed()
            checkHowManyConfirmed()
        end
        checkForGameWinner()
    end

    if system=="Android" then
        if love.keyboard.hasTextInput() then
            androidKeyboard=screenh/3
        else
            androidKeyboard=0
        end
    end
end

function love.draw()
    love.graphics.setColor(bgc[1],bgc[2],bgc[3])
    love.graphics.rectangle("fill",0,0,screenw,screenh)
    love.graphics.setColor(bgc[1]+0.2,bgc[2]+0.2,bgc[3]+0.2)
    love.graphics.rectangle("fill",50,50,screenw-100,screenh-100)
    love.graphics.setColor(1,1,1)

    if system=="Android" then
        love.graphics.setColor(0.35,0.8,0.3)
        love.graphics.rectangle("fill",0,screenh-50,50,50,4.5)
        love.graphics.setColor(1,1,1)
        love.graphics.draw(keyboardImage,0,screenh-50)
    end

    if onStartMenu then
        love.graphics.printf("Pressione N para criar uma sala!",font,0,screenh/2-androidKeyboard,screenw,"center")
        love.graphics.printf("Ou digite aqui o id de uma sala e pressione enter: "..partyId,font,0,screenh/2+25-androidKeyboard,screenw,"center")
    elseif onNameMenu then
        love.graphics.printf("Digite seu nome: "..localName,font,0,screenh/2-androidKeyboard,screenw,"center")
        love.graphics.printf("e aperte enter para continuar!",font,0,screenh/2+25-androidKeyboard,screenw,"center")
    elseif waitingPlayers then
        love.graphics.printf("ID da sua sala: "..tostring(partyId),font,0,screenh/2-androidKeyboard,screenw,"center")
        love.graphics.printf("Pessoas na sala: "..tostring(totalPlayers),font,0,screenh/2+25-androidKeyboard,screenw,"center")
        
        if partyId==tostring(localId) then 
            love.graphics.printf("Pressione S para iniciar a partida!",font,0,screenh/2+50-androidKeyboard,screenw,"center") 
        else
            love.graphics.printf("Espere o dono da sala iniciar a partida!",font,0,screenh/2+50-androidKeyboard,screenw,"center")
        end
        if system=="Android" then
            love.graphics.printf("Pressione Voltar para sair dessa sala!",font,0,5,screenw,"center") 
        else
            love.graphics.printf("Pressione Esc para sair dessa sala!",font,0,screenh-50,screenw,"center") 
        end
    elseif gameOver then
        love.graphics.printf(gameWinner.." ganhou o jogo!",font,0,screenh/2-androidKeyboard,screenw,"center")        
        love.graphics.printf("Pressione Voltar para voltar ao menu inicial!",font,0,5,screenw,"center") 
    else
        if imdead==false then
            local offset = (screenw - (#playerCartas * cardW*cardSize + (#playerCartas - 1) * spacing)) / 2
            if round==1 and #playerCartas==1 then
                local x = offset + (0) * (cardW*cardSize + spacing)
                love.graphics.draw(cardback,x,screenh-cardH*cardSize,0,cardSize)
            else
                for k,v in ipairs(playerCartas) do
                    local x = offset + (k - 1) * (cardW*cardSize + spacing)
                    love.graphics.draw(v.img,x,screenh-cardH*cardSize,0,cardSize)
                end
            end    
        else
            love.graphics.printf("Você morreu!",font,0,screenh-40,screenw,"center")
            love.graphics.printf("Assista seus amigos jogarem!",font,0,screenh-20,screenw,"center")
        end
        
        love.graphics.setColor(0.1,0.1,0.1,0.5)
        love.graphics.rectangle("fill",screenw-(14*14),screenh-65,(14*21),75,5)
        love.graphics.setColor(1,1,1,1)
        love.graphics.printf("Partidas Vencidas: "..roundsWon,font,0,screenh-60,screenw,"right")
        love.graphics.printf("Apostas: "..roundBet,font,0,screenh-40,screenw,"right")
        love.graphics.printf("Vidas: "..vidas,font,0,screenh-20,screenw,"right")        
        
        for k,value in ipairs(enemiesHand) do
            local offset = (screenw - (#value.cards * cardW*cardSize + (#value.cards - 1) * enemySpacing)) / 2
            local offy = 0
            local rotation = 0
            local textrotation = 0
            local index=getPlayerIndex(value.id)
            if index == 1 then
                offset = 0
                offy = (screenh - (#value.cards * cardH*cardSize + (#value.cards - 1) * enemySpacing)) / 2 + (screenh/4+#value.cards-1*enemySpacing) / 2
                rotation=math.rad(-90)
                textrotation=math.rad(-90)
            elseif index == 2 then
                offset = (screenw - (#value.cards * cardW*cardSize + (#value.cards - 1) * enemySpacing)) / 2
                offy = 0
            elseif index == 3 then
                offset = screenw - cardH*cardSize
                offy = (screenh - (#value.cards * cardH*cardSize + (#value.cards - 1) * enemySpacing)) / 2 + (screenh/4+#value.cards-1*enemySpacing) / 2
                rotation=math.rad(-90)
                textrotation=math.rad(90)
            end
            for i,v in ipairs(value.cards) do
                local drawing = v.img
                if round>1 then drawing=cardback end
                local x = offset
                local y = offy
                if rotation==0 then
                    x = offset + (i - 1) * (cardW*cardSize + enemySpacing)
                else
                    y = offy + (i - 1) * (cardW*cardSize+enemySpacing)
                end
                love.graphics.draw(drawing,x,y,rotation,cardSize)
            end
            if #value.cards>0 then
                local whereY = offy
                local whereX = offset
                if offy==0 then whereY = cardH*cardSize+10 end    
                if textrotation~=0 then
                    if whereX==0 then
                        whereX=whereX+(cardH*cardSize)
                        whereY=whereY+(#value.cards-1)*(cardW*cardSize+enemySpacing)
                    else
                        whereX=whereX
                        whereY=whereY-(cardW*cardSize)
                    end
                end
                local enemybet = 0
                local enemyDealer = "" -- |D|
                if enemiesBets[value.id] then enemybet=enemiesBets[value.id] end
                if whoTurn==value.id then love.graphics.setColor(0.5,0.9,0.5) end
                if whoDealer==value.id then enemyDealer="Dealer" end
                love.graphics.print(value.name..": "..enemybet.."\n"..enemyDealer,font,whereX,whereY,textrotation)   
                love.graphics.setColor(1,1,1)
            end         
        end
        for k,value in ipairs(playedCards) do
            local offset = screenw/5+k*cardW*cardSize+spacing*k--(screenw - (#value.cards * cardW*cardSize + (#value.cards - 1) * spacing)) / 2
            local drawing = value.img
            --print("playedCards: "..value.number)
            --local x = offset * (cardW*cardSize + spacing)
            love.graphics.draw(drawing,offset,screenh/2-(cardH*cardSize/2)+10,0,cardSize)            
            --love.graphics.draw(drawing,0,0,0,cardSize)            
            love.graphics.printf(value.name,font,offset,screenh/2-(cardH*cardSize/2)-10,cardW*cardSize,"center")              
        end
        if whoTurn==localId then
            local x = 0
            local limit = screenw-androidSpacing
            local y = screenh/2-(cardH*cardSize/2)+(cardH*cardSize)+10
            if system=="Android" then
                if love.keyboard.hasTextInput() then
                    limit=screenw
                    y=screenh/6-10
                    love.graphics.setColor(0.1,0.1,0.1,0.5)
                    love.graphics.rectangle("fill",screenw/4,y-20,screenw/2,80,5)
                    love.graphics.setColor(1,1,1,1)
                end
            end
            if betTime then
                love.graphics.printf("Faz: "..fazQuantas,font,x,y+30,limit,"center")
                if whoDealer==localId then 
                    love.graphics.printf("Apostas totais: "..totalBet,font,x,y+50,limit,"center") 
                    if wrongbet then
                        love.graphics.printf("Sua aposta não pode ser esse valor!",font,x,y+70,limit,"center") 
                    end
                end
            end
            if #playerCartas>0 then
                if clearConfirm==false then love.graphics.printf("Seu turno!",font,x,y+10,limit,"center") end
            end
        end
        if #playerCartas==0 and confirmTime then
            love.graphics.printf(nameWon.." ganhou essa rodada!",font,0,screenh-40,screenw,"center")
            if system=="Android" then
                love.graphics.printf("Clique em qualquer lugar para confirmar e prosseguir!",font,0,screenh-20,screenw,"center") 
            else
                love.graphics.printf("Pressione S para confirmar e prosseguir!",font,0,screenh-20,screenw,"center") 
            end
        end
    end

    if clearConfirm then
        love.graphics.setColor(0.1,0.1,0.1,0.5)
        love.graphics.rectangle("fill",screenw/2-(36*18/2),0,screenw/2+(36*18/2),18*2+25,5)
        love.graphics.setColor(1,1,1)
        love.graphics.printf("Pressione a tela para continuar!",font,0,0,screenw,"center")
        love.graphics.printf(nameWon.." ganhou essa rodada!",font,0,20,screenw,"center")
    end
end

function addCards()
    local alreadyThere = {}
    local totalCards = round
    if round>7 then
        totalCards=7
    end
    local tempcards = {}
    local tempcardsrect = {}
    for k=1,#players do
        for i=1,totalCards do
            local spacing = 5
            local offset = (screenw - (totalCards * cardW*cardSize + (totalCards - 1) * spacing)) / 2
            local x = offset + (i - 1) * (cardW*cardSize + spacing)
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
            tempcards[i]={number=number,naipe=naipe,rank=rank,img="cards/"..number.."_of_"..naipe..".png"}
            tempcardsrect[i]={x=x,y=screenh-cardH*cardSize,w=cardW*cardSize,h=cardH*cardSize}
        end
        if players[k]==localId then
            playerCartas=tempcards
            playerCartasRect=tempcardsrect
        else
            publish("yourcards",json.encode({id=players[k],cards=tempcards,rects=tempcardsrect}))
        end
        tempcards={}
        tempcardsrect={}
    end
    makeImgs()
    showHand()
end

function makeImgs()
    for i=1,#playerCartas do
        if type(playerCartas[i].img)=="string" then
            local image=love.graphics.newImage(playerCartas[i].img)
            playerCartas[i].img=image
        end
    end
end

function remakeRects()
    playerCartasRect = {}
    for k,v in ipairs(playerCartas) do
        local spacing = 5
        local offset = (screenw - (#playerCartas * cardW*cardSize + (#playerCartas - 1) * spacing)) / 2
        for k,v in ipairs(playerCartas) do
            local x = offset + (k - 1) * (cardW*cardSize + spacing)
            playerCartasRect[k] = {x=x,y=screenh-cardH*cardSize,w=cardW*cardSize,h=cardH*cardSize}
        end
    end
end

function love.mousepressed(x,y,btn)

    if clearConfirm then
        clearConfirm=false
        clearTable()
        return nil
    end

    if gameOver then
        gameOver=false
        onStartMenu=true
        resetVars()
        return nil
    end

    if system=="Android" then
        if x >= 0 and x <= 0 + 50 and y >= screenh-50 and y <= screenh-50 + 50 then
            love.keyboard.setTextInput(true)
        end
        if confirmTime then
            publish("confirm",true)
            whoConfirmed=whoConfirmed+1
            confirmTime=false
        end
    end

    if betTime==false and whoTurn==localId then
        for i, carta in ipairs(playerCartasRect) do
            if x >= carta.x and x <= carta.x + carta.w and y >= carta.y and y <= carta.y + carta.h then
                -- Carta clicada!
                local v = playerCartas[i]
                local temp = {number=v.number,naipe=v.naipe,rank=v.rank,img="cards/"..v.number.."_of_"..v.naipe..".png",index=i}
                publish("playcard",json.encode(temp))
                v["id"] = localId
                v["name"] = localName
                table.insert(playedCards,v)
                table.remove(playerCartas,i)
                table.remove(playerCartasRect,i)
                whoPlayed=whoPlayed+1
                local totalrounds = round
                if totalrounds>7 then totalrounds=7 end
                if partyId==tostring(localId) and (whoDealer~=localId or passedRounds<totalrounds) then
                    changeTurn(false)
                end
                remakeRects()                
                break
            end
        end
    end
end

function love.textinput(t)
    if onNameMenu then
        localName=localName..t
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
            players={}
            players[1]=localId
            namePlayers={}
            enemiesHand={}
            enemiesBets={}
            drawingPlayers={}
            enterGame(tostring(localId))
            partyId=tostring(localId)
        end
    elseif imdead then
        if key=="escape" then
            imdead=false
            onStartMenu=true
            resetVars()
        end        
    elseif onNameMenu then
        if key=="backspace" then
            local byteoffset = utf8.offset(localName, -1)
            if byteoffset then                
                localName = string.sub(localName, 1, byteoffset - 1)
            end
        elseif key=="return" then
            onNameMenu=false
            onStartMenu=true
        end
        if #localName>6 then localName=string.sub(localName,1,6) end
    elseif waitingPlayers then
        if key=="escape" then
            waitingPlayers=false
            onStartMenu=true
            partyId=""
            leaveGame()
        end
        if key=="s" and partyId==tostring(localId) then
            if totalPlayers~=1 then
                waitingPlayers=false
                publish("startgame")
                publish("whodealer",localId)
                publish("newround",1)
                newRound(1)
                changeTurn(true)
                --showHand()
            end
        end
    elseif betTime then
        if whoDealer==localId and fazQuantas+totalBet==#playerCartas then wrongbet=true end
        if key=="backspace" then
            fazQuantas = fazQuantas-1
            if fazQuantas<0 then fazQuantas=0 end
        elseif key=="return" and wrongbet==false then
            sendBet()
            roundBet=fazQuantas
            if system=="Android" then
                love.keyboard.setTextInput(false)
            end
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
    elseif confirmTime then
        if key=="s" then
            if system~="Android" then
                publish("confirm",true)
                whoConfirmed=whoConfirmed+1
                confirmTime=false
            end
        end
    end
end

function resetVars()
    players={}
    players[1]=localId
    namePlayers={}
    enemiesHand={}
    enemiesBets={}
    drawingPlayers={}
    totalPlayers=1
    partyId=""
end

function newRound(roundup)
    playerCartas={}
    round=round+roundup
    fazQuantas=0
    enemiesHand = {}
    enemiesBets={}
    betTime=true
    totalBet=0
    clearTable()
    if partyId==tostring(localId) then
        publish("checkdead")
        checkForLife()
        addCards()
    end
    --checkForLife()
    if imdead then return nil end
end

function clearTable()
    playedCards = {}
end

function sendBet()
    publish("bet",fazQuantas)
    if partyId==tostring(localId) then
        changeTurn(false)
    end
end

function changeTurn(inicio)
    if inicio==false then        
        publish("whoturn",getNext(players,whoTurn))
        whoTurn=getNext(players,whoTurn)
        if gotEnd==true and whoTurn==getNext(players,whoDealer) then
            if betTime==true then
                publish("bettime",false)
                betTime=false
            end
            gotEnd=false
        end
        if whoTurn==whoDealer then gotEnd = true end
    else
        publish("whoturn",getNext(players,whoDealer))
        whoTurn=getNext(players,whoDealer)
    end
end

function sendPlayerlist()
    local temp = {}
    --for i=1,#drawingPlayers do
    --    table.insert(temp,{index=i+1,id=drawingPlayers[i]})
    --end
    --table.insert(temp,{index=1,id=localId})
    for i=1,#players do
        table.insert(temp,{index=i,id=players[i]})
    end
    publish("listplayers",json.encode(temp))
end

function showHand()
    local temp = {}
    for k,v in ipairs(playerCartas) do
        temp[k]={number=v.number,naipe=v.naipe,rank=v.rank,img="cards/"..v.number.."_of_"..v.naipe..".png"}
    end
    publish("myhand",json.encode(temp))
end

function checkHowManyPlayed()
    local totalrounds = round
    if totalrounds>7 then totalrounds=7 end
    if #players==whoPlayed and passedRounds>=totalrounds then
        whoWon()
        publish("confirmtime",true)
        whoPlayed=0
        confirmTime=true
        passedRounds=1
    end
    if #players==whoPlayed and passedRounds<totalrounds then
        whoPlayed=0
        --check who won
        passedRounds=passedRounds+1
        whoWon()
        clearConfirm=true
        publish("clearconfirm", true)
    end
end

function checkForLife()
    if roundsWon~=roundBet then
        vidas=vidas-1
    end
    roundsWon=0
    roundBet=0

    if vidas<=0 then
        imdead=true
        if partyId==tostring(localId) then
            table.remove(players,1)
        else
            publish("imdead")
        end
    end
end

function whoWon()    
    local idRanks=playedCards
    table.sort(idRanks, compararPorRank)
    local winnerId = idRanks[1].id
    local melou = false
    local melouRank = idRanks[1].rank
    
    for k,v in ipairs(idRanks) do -- 3 3 4 4 5
        if k>1 then
            if melou then
               melouRank = v.rank 
               melou=false
               winnerId=v.id            
            elseif v.rank==melouRank and melou==false then
                melou=true
            end
        end
    end
    publish("winner",winnerId)
    publish("whoturn",winnerId)
    whoTurn=winnerId
    if winnerId==localId then
        roundsWon=roundsWon+1
        nameWon = "Você"
    else
        nameWon=getName(winnerId)
    end
end

function compararPorRank(a, b)
    return a.rank < b.rank
end

function checkHowManyConfirmed()
    if whoConfirmed==#players then
        local nextDealer = getNext(players,whoDealer)
        publish("whodealer",nextDealer)
        whoDealer=nextDealer
        publish("confirmtime",false)
        changeTurn(true)
        showHand()
        publish("newround",1)
        newRound(1)
        clearTable()
        whoConfirmed=0
    end
end

function checkForGameWinner()
    if #players==1 and waitingPlayers==false and onStartMenu==false and onNameMenu==false then --bug fix
        publish("gamewinner",namePlayers[players[1]])
        gameWinner=namePlayers[players[1]]
        gameOver=true
        imdead=false
        --resetVars()
    end
end

function publish(action,content)    
    hub:publish({
        message = {
            action = action,
            content = content,
            id = localId,
            name = localName,
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
                playerCartas={}
                newRound(message.content)
                fazQuantas=0                
            end
            if message.action=="checkdead" and imdead==false and tostring(message.id)==partyId then
                checkForLife()
            end
            if message.action=="yourcards" and tostring(message.id)==partyId then
                local temp = json.decode(message.content)
                if temp.id==localId then
                    playerCartas=temp.cards
                    playerCartasRect=temp.rects
                end
                makeImgs()
                showHand()
            end
            if message.action=="myhand" then
                --for k,v in ipairs(enemiesHand) do
                --    if v.id==message.id then return nil end
                --end
                local temp = json.decode(message.content)
                local temptwo = {}
                for k,v in ipairs(temp) do
                    temptwo[k]={naipe=v.naipe,number=v.number,rank=v.rank,img=love.graphics.newImage(v.img)}
                end
                local obj = {name=message.name,id = message.id,cards = temptwo}
                table.insert(enemiesHand,obj)
            end
            if message.action=="justjoined" then
                totalPlayers=totalPlayers+1
                if message.content==tostring(localId) then
                    publish("updatetotalplayers",totalPlayers)
                    players[#players+1] = message.id
                    drawingPlayers[#drawingPlayers+1] = message.id
                    namePlayers[message.id] = message.name
                    sendPlayerlist()
                end
            end
            if message.action=="updatetotalplayers" and tostring(message.id)==partyId then
                totalPlayers=message.content
            end
            if message.action=="listplayers" and tostring(message.id)==partyId then
                local temp = json.decode(message.content)
                local temptwo = {}
                for k,v in ipairs(temp) do
                    temptwo[v.index]=v.id
                end
                local newindex = 0
                for i=1,#temptwo do
                    if temptwo[i] == localId then newindex=i end
                end -- 1 2 *3* 4
                    -- 2 3  X  1
                    -- 1 *2* 3 4
                    -- 3  X  1 2
                local count = 1
                local result = {}
                if newindex==4 then
                    table.remove(temptwo,4)
                    result=temptwo  
                else               
                    for i = newindex+1, #temptwo do
                        result[count] = temptwo[i]
                        count = count + 1
                    end
                    for i = 1, newindex - 1 do
                        result[count] = temptwo[i]
                        count = count + 1
                    end 
                end
                drawingPlayers = result
            end
            if message.action=="whoturn" and tostring(message.id)==partyId then
                whoTurn = message.content
            end
            if message.action=="whodealer" and tostring(message.id)==partyId then
                whoDealer = message.content
            end
            if message.action=="startgame" and tostring(message.id)==partyId then
                waitingPlayers=false
                if system=="Android" and love.keyboard.hasTextInput() then love.keyboard.setTextInput(false) end
            end
            if message.action=="bet" then
                if partyId==tostring(localId) then
                    changeTurn(false)
                end
                totalBet=totalBet+message.content
                enemiesBets[message.id]=message.content
            end
            if message.action=="bettime" and tostring(message.id)==partyId then
                betTime=message.content
            end
            if message.action=="confirmtime" and tostring(message.id)==partyId and imdead==false then
                confirmTime=message.content
            end
            if message.action=="playcard" then
                if clearConfirm then
                    clearConfirm=false
                    clearTable()
                end
                whoPlayed=whoPlayed+1
                local v = json.decode(message.content)                
                local image = love.graphics.newImage(v.img)
                local temp = {name=message.name,id=message.id,naipe=v.naipe,number=v.number,rank=v.rank,img=image,index=v.index}
                table.insert(playedCards,temp)
                for k,value in ipairs(enemiesHand) do
                    if value.id==message.id then
                        table.remove(value.cards,v.index)
                    end
                end
                if partyId==tostring(localId) then
                    changeTurn(false)
                end
            end
            if message.action=="confirm" and partyId==tostring(localId) then
                whoConfirmed=whoConfirmed+1
            end
            if message.action=="winner" then
                if message.content==localId then
                    roundsWon=roundsWon+1
                    nameWon = "Você"
                else
                    nameWon=getName(message.content)
                end
            end
            if message.action=="clearconfirm" then
                clearConfirm=true
            end
            if message.action=="imdead" then
                if partyId==tostring(localId) then
                    for i=1,#players do
                        if players[i]==message.id then
                            table.remove(players,i)
                        end
                    end
                    local temp = {}
                    local index = 1
                    for k,v in ipairs(players) do
                        temp[index] = tonumber(v)
                        index = index + 1
                    end
                    players = temp
                    publish("newround",0)
                    newRound(0)
                    publish("whodealer",tonumber(players[1]))
                    whoDealer=players[1]
                    publish("whoturn",tonumber(players[2]))
                    whoTurn=players[2]
                end
            end
            if message.action=="gamewinner" and partyId==tostring(message.id) then
                gameWinner=message.content
                gameOver = true
                imdead=false
                --resetVars()
            end
        end
    })
    publish("justjoined",partyId)
end

function leaveGame()
    hub:unsubscribe()
end

function getName(id)
    for k,v in ipairs(enemiesHand) do
        if v.id==id then return v.name end
    end
    return ""
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
        return list[index+1]
    else
        return nil -- Item atual não encontrado na lista
    end
end

function getIndexPerId(list,id)
    for k,v in ipairs(list) do
        if v.id==id then
            return k
        end
    end
end

function getPlayerIndex(id)
    for k,v in ipairs(drawingPlayers) do
        if v==id then
            return k
        end
    end
end

function getTableById(list,id)
    for i = 1,#list do
        if list[i].id then
            if list[i].id==id then
                return list[i]
            end
        end
    end
end