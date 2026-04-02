import { useState, useEffect } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable
} from "@hello-pangea/dnd";

export default function DailyPlanning() {

  const [plan, setPlan] = useState([]);
  const [date, setDate] = useState("");

  // Sample initial load (can come from API later)
  useEffect(() => {
    setPlan([
      { id: "1", part_number: "A100", qty: 100, shift: "A" },
      { id: "2", part_number: "B200", qty: 150, shift: "A" }
    ]);
  }, []);

  // 🔥 Drag logic
  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(plan);
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);

    setPlan(items);
  };

  // ➕ Add new part manually
  const addRow = () => {
    setPlan([
      ...plan,
      {
        id: Date.now().toString(),
        part_number: "",
        qty: 0,
        shift: "A"
      }
    ]);
  };

  // ✏️ Edit fields
  const handleChange = (index, field, value) => {
    const updated = [...plan];
    updated[index][field] = value;
    setPlan(updated);
  };

  // 💾 Save to backend
  const savePlan = async () => {

    const payload = plan.map((p, index) => ({
      date,
      part_number: p.part_number,
      qty: Number(p.qty),
      shift: p.shift,
      priority: index + 1
    }));

    await fetch("http://localhost:8020/planning/set-daily-plan", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    alert("Plan saved");
  };

  return (
    <div style={{ padding: 20 }}>

      <h1 style={{ color: "#C8102E" }}>Daily Planning</h1>

      {/* DATE */}
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />

      <br /><br />

      <button onClick={addRow}>Add Part</button>
      <button onClick={savePlan} style={{ marginLeft: 10 }}>
        Save Plan
      </button>

      <br /><br />

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="plan">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps}>

              {plan.map((item, index) => (
                <Draggable
                  key={item.id}
                  draggableId={item.id}
                  index={index}
                >
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      style={{
                        padding: 10,
                        marginBottom: 10,
                        background: "#222",
                        color: "white",
                        display: "flex",
                        gap: 10,
                        ...provided.draggableProps.style
                      }}
                    >

                      <span style={{ width: 30 }}>{index + 1}</span>

                      <input
                        placeholder="Part Number"
                        value={item.part_number}
                        onChange={(e) =>
                          handleChange(index, "part_number", e.target.value)
                        }
                      />

                      <input
                        type="number"
                        placeholder="Qty"
                        value={item.qty}
                        onChange={(e) =>
                          handleChange(index, "qty", e.target.value)
                        }
                      />

                      <select
                        value={item.shift}
                        onChange={(e) =>
                          handleChange(index, "shift", e.target.value)
                        }
                      >
                        <option value="A">A</option>
                        <option value="B">B</option>
                        <option value="C">C</option>
                      </select>

                    </div>
                  )}
                </Draggable>
              ))}

              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

    </div>
  );
}