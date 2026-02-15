# Welcome to smd

**smd** is a simple, lightweight markdown viewer for the desktop.

## Features

- GitHub Flavored Markdown support
- Syntax highlighted code blocks
- Light and dark themes
- Zoom in/out (Ctrl+/-, Ctrl+scroll)
- Drag & drop files

## Code Example

```python
def fibonacci(n):
    """Generate the first n Fibonacci numbers."""
    a, b = 0, 1
    for _ in range(n):
        yield a
        a, b = b, a + b

for num in fibonacci(10):
    print(num)
```

```rust
fn main() {
    let message = "Hello from smd!";
    println!("{}", message);
}
```

## Table

| Shortcut | Action |
|----------|--------|
| Ctrl+O | Open file |
| Ctrl+T | Toggle theme |
| Ctrl++ | Zoom in |
| Ctrl+- | Zoom out |
| Ctrl+0 | Reset zoom |

## Blockquote

> Simplicity is the ultimate sophistication.
> — Leonardo da Vinci

## Task List

- [x] Markdown rendering
- [x] Syntax highlighting
- [x] Theme support
- [x] Zoom controls
- [ ] World domination

## Horizontal Rule

---

That's it! Simple and clean.
