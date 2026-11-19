-- Used by export-lld.sh. Wraps a lead-in line such as "**Where to start.**" and
-- the table that follows it in one block, so export.css can keep them on the
-- same page. Chrome ignores `break-after: avoid` on the line by itself.

local function is_lead_in(block)
  return block.t == "Para" and #block.content == 1 and block.content[1].t == "Strong"
end

function Blocks(blocks)
  local out = pandoc.List()
  local i = 1
  while i <= #blocks do
    local block, next_block = blocks[i], blocks[i + 1]
    if is_lead_in(block) and next_block and next_block.t == "Table" then
      out:insert(pandoc.Div({ block, next_block }, pandoc.Attr("", { "keep-together" })))
      i = i + 2
    else
      out:insert(block)
      i = i + 1
    end
  end
  return out
end
