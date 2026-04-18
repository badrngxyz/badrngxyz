---
title: Solving Sudoku in Elixir
date: 2099-12-31
---

# Solving Sudoku in Elixir

Even though I like playing logical games for the mind tickling, sometimes I just want to unwind and would love a little help without paying for tips. Combine logic with an algorithm, and you get a nice challenge that leads to your dirty cheat. Also, since you worked out how to solve it algorithmically, do you even call it a cheat?

After messing with [Sudoku](), I started noticing some patterns in the way I solve it and though that it ressembled an [Observer]() pattern. Since Observer is based on things cooperating, why not using message passing to help with that?

For sure there's a smarter way to solve it, but I would like to encode my strategy and learn along the way. So I'll grab my favorite tool of choice, Elixir, and give it a try.

## Slicing the game

I'm no expert in Sudoku, but it revolves around preventing conflicts between different cells. These are the constraints on cells for a simple Sudoku:

- Within a 3x3 square, there must be no repetition
- Lines, horizontal or vertical, must contain a single instance of every number

Naturally, the first component we must create is the cell. But what constitutes a cell before it's resolved? For the strategy I use, I think in terms of possibilities and other cells to watch for.

```elixir
defmodule Sudoku.Cell do
  defstruct value: 0, options: 1..9, watch: []
end
```

I'm using `0` as the default value because it's an invalid number in the game, and it helps representing a board of sudoku with numbers alone. For example, the following is a board with just one cell missing

```
023
456
789
```

Also, it'll help check if a board has been solved. For the moment, the board struct will actually be a sub-board because it eases the collaboration and there's no way to get it wrong if you don't repeat numbers.

```elixir
defmodule Sudoku.Board do
  defstruct cells: []

  def start(), do: %__MODULE__{cells: Enum.map(1..9, fn _ -> %Sudoku.Cell{} end)}

  def solved?(%__MODULE__{} = board), do: Enum.all?(board.cells, & &1 != 0)
end
```

As those cells settle on a `value`, we need to remove that possibility from others that're impacted by the constraints, so maybe we don't need to watch but rather cooperate with other cells and tell them we've been settled.

```elixir
defmodule Sudoku.Cell do
  defstruct value: 0, options: 1..9, watch: []

  def settle(%__MODULE__{} = board, value) do
    impacts = Enum.map(board.impacts, &discard(&1, value))

    %{board | value: value, impacts: impacts}
  end

  defp discard(%__MODULE__{} = board, value) do
    options = List.delete(board.options, value)
    %{board | options: options}
  end
end
```

Duck: Wait! Hold your horses dear author, aren't we working in Elixir? A functional language with immutable data. It's all beautiful while you talk about a single cell, but what happens with cells in `Sudoku.Board`? How would you work around settling individual cells while propagating that to others?

## Processes to the rescue

We could use the environment to our advantage, and create a solution that mirrors the colaboration I use while solving those puzzles!

Even though Elixir is immutable, it inherits the BEAM VM and we can model mutable data using processes. Also, on top of allowing mutability, they work based on message passing and allow for easy cooperation between themselves. Let's evolve the current `Sudoku.Cell` to a `GenServer`:

```elixir
defmodule Sudoku.Cell do
  defstruct options: Enum.to_list(1..9), impacts: []

  use GenServer

  def settle(pid, value) do
    GenServer.call(pid, {:settle, value})
  end

  def correlate(pid, pids) do
    GenServer.call(pid, {:correlate, pids})
  end

  def settled?(pid) do
    GenServer.call(pid, :settled?)
  end

  defp discard(pid, value) do
    GenServer.call(pid, {:discard, value})
  end

  @impl true
  def init(_), do: {:ok, %__MODULE__{}}

  @impl true
  def handle_call({:correlate, pids}, _, state) do
    pids = List.delete(pids, self())

    {:reply, :ok, %{state | impacts: pids}}
  end

  def handle_call({:settle, value}, _, state) do
    Enum.each(state.impacts, &discard(&1, value))

    {:reply, :ok, %{state | options: [value]}}
  end

  def handle_call(:settled?, _, state) do
    {:reply, match?(%{options: [_]}, state), state}
  end

  def handle_call({:discard, value}, _, state) do
    options = List.delete(state.options, value)

    {:reply, :ok, %{state | options: options}}
  end
end
```

You'll notice that the process doesn't impact anyone at the start. That's because it leads to a chicken and the egg if we set it as a pre-requisite for a cell's existence. Instead, we need to create the whole board and correlate each cell from the outside, we need a _leader_ - the `Sudoku.Board` module.

```elixir
defmodule Sudoku.Board do
  defstruct cells: []

  def start() do
    cells =
      Enum.map(1..9, fn _ ->
        {:ok, pid} = GenServer.start_link(Sudoku.Cell, nil)

        pid
      end)

    Enum.each(cells, &Sudoku.Cell.correlate(&1, cells))

    %__MODULE__{cells: cells}
  end

  def solved?(%__MODULE__{} = board) do
    Enum.all?(board.cells, &Sudoku.Cell.settled?/1)
  end
end
```

Another thing we changed, to take advantage of processes communicating between themselves is: a cell becomes solved the moment there's a single option left. For a subgrid of 3x3 (our current board), this results in a single cell, but on the whole 9x9 grid, it'll result in an entire subgrid resolving automatically.

```elixir
board = Sudoku.Board.start()

board.cells
|> Enum.shuffle()
|> Enum.take(8)
|> Enum.with_index()
|> Enum.each(fn {cell, n} ->
  Sudoku.Cell.settle(cell, n + 1)
end)

true = Sudoku.Board.solved?(board)
```

Duck: Coooool! Even though you're only settling 8 of the 9 cells, the last one derives its value automatically. But what if I give you a game with multiple solutions?

## Nudging the cells

The objective for this is to have the game solve by itself eventually, but that won't happen if there's nothing that helps resolve conflicts. For example, suppose I give you a full board with only 2 cells solved, you would need to start experimenting from there until you find a solution that works, and there are `79!` possible solutions. For that, we often pick a random number in the available options and continue filling the board with random picks that don't break the rules. Since we're working with valid options only, we can pick one at random and propagate that to its neighbors.

```elixir
  # lib/sudoku/cell.ex
  def nudge(pid) do
    GenServer.call(pid, :nudge)
  end

  def handle_call(:nudge, _, state) do
    pick = Enum.random(state.options)
    Enum.each(state.impacts, &discard(&1, pick))

    {:reply, :ok, %{state | options: [pick]}}
  end
```

But when do you nudge the cell? If there was only a method to detect idleness, it would mirror the "I'm stuck" sensation of us mere humans.

Duck: You could use a `receive` loop with `after`! However, your board is always idle because it only starts the subprocesses and receives no message.

If the only constraint for making this work is receiving messages, we could monitor the processes and terminate cells that resolved. As those cells have no purpose after they narrow to a single option, we don't need to keep the processes around and can take advantage of that to create a receive loop that detects when things have finished. To achieve that we must stop the cell processes upon their resolution and listen to messages at `Sudoku.Board`.

```elixir
# lib/sudoku/cell.ex
  def handle_call({:settle, value}, _, state) do
    notify(state.impacts, value)

    next(state, [value])
  end

  def handle_call(:nudge, _, state) do
    pick = Enum.random(state.options)
    notify(state.impacts, pick)

    next(state, [pick])
  end

  def handle_call({:discard, value}, _, state) do
    options = List.delete(state.options, value)

    next(state, options)
  end

  defp notify(pids, val) do
    for pid <- pids, Process.alive?(pid) do
      discard(pid, val)
    end
  end

  defp next(state, [val]) do
    {:stop, :normal, :ok, %{state | options: [val]}}
  end

  defp next(state, options) do
    {:reply, :ok, %{state | options: options}}
  end
```

```elixir
defmodule Sudoku.Board do
  defstruct cells: []

  def start() do
    cells =
      Enum.map(1..9, fn _ ->
        {:ok, pid} = GenServer.start_link(Sudoku.Cell, nil)
        Process.monitor(pid)

        pid
      end)

    Enum.each(cells, &Sudoku.Cell.correlate(&1, cells))

    solve(%__MODULE__{cells: cells})
  end

  defp solve(board) do
    if solved?(board) do
      board
    else
      loop(board)
    end
  end

  defp loop(board) do
    receive do
      {:DOWN, _, :process, _, {:normal, value}} -> solve(board)
    after 0 ->
      board.cells
      |> Enum.filter(&Process.alive?/1)
      |> Enum.random()
      |> Sudoku.Cell.nudge()

      solve(board)
    end
  end

  def solved?(%__MODULE__{} = board) do
    Enum.all?(board.cells, &!Process.alive?(&1))
  end
end
```

Duck: Let's see if I understand, you create processes and then make them communicate with each other until they die. If no process dies, and the board remains unsolved, then it's time to nudge a random cell. Once all processes die, it means the board is finally solved and you can leave the loop. So, for the given empty board, it means that you'll always get a solved board after you call `start/0`?

```elixir
board = Sudoku.Board.start()

true = Sudoku.Board.solved?(board)
```

Duck: Right on! But do you think all of this complexity is necessary? I mean, you're using a bunch of processes and you can't even show the end result to me. I know that the cell process could send a message back to the board right before dying, and you would cover this last point. However, we haven't even talked about the fact you're using unsupervised processes; don't you think the end result will be a tasty carbonara?

## Think about the data
