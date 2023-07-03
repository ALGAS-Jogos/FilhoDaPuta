-- Tabela pai contendo várias tabelas internas com id e rank
local tabelaPai = {
    {id = 1, rank = 3},
    {id = 2, rank = 1},
    {id = 3, rank = 2}
}

-- Função de comparação para ordenar com base no valor do "rank"
local function compararPorRank(a, b)
    return a.rank < b.rank
end

-- Ordenar a tabela pai com base no "rank"
table.sort(tabelaPai, compararPorRank)

-- Imprimir a tabela pai ordenada
for i, tabelaInterna in ipairs(tabelaPai) do
    print("ID:", tabelaInterna.id, "Rank:", tabelaInterna.rank)
end
