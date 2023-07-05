function findAndReorder(table)
    local startIndex = nil
    for i, value in pairs(table) do
      if value == 1 then
        startIndex = i
        break
      end
    end
  
    if not startIndex then
      return {} -- Retorna uma tabela vazia se o valor 1 não for encontrado
    end
  
    local result = {}
    local count = 1
    for i = startIndex+1, #table do
      result[count] = table[i]
      count = count + 1
    end
    for i = 1, startIndex - 1 do
      result[count] = table[i]
      count = count + 1
    end
  
    return result
  end
  
  -- Exemplo de uso:
  local inputTable = {5, 7, 1, 3}
  local outputTable = findAndReorder(inputTable)
  
  for i, value in ipairs(outputTable) do
    print(i .. "=" .. value)
  end
  
