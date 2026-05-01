import re


def translate_to_typst(text: str) -> str:
    """Convert plain text to a basic Typst document."""
    lines = text.splitlines()
    output: list[str] = ["#set page(margin: 2cm)", "#set text(font: \"Linux Libertine\", size: 11pt)", ""]

    i = 0
    while i < len(lines):
        line = lines[i].rstrip()

        if not line:
            output.append("")
            i += 1
            continue

        # Headings: lines followed by === or --- (setext style)
        if i + 1 < len(lines):
            next_line = lines[i + 1].rstrip()
            if re.fullmatch(r"=+", next_line):
                output.append(f"= {line}")
                i += 2
                continue
            if re.fullmatch(r"-+", next_line):
                output.append(f"== {line}")
                i += 2
                continue

        # Headings: # / ## / ### prefix (markdown-like)
        heading_match = re.match(r"^(#{1,3})\s+(.*)", line)
        if heading_match:
            level = len(heading_match.group(1))
            content = heading_match.group(2)
            output.append("=" * level + f" {content}")
            i += 1
            continue

        # Unordered list items: - or *
        list_match = re.match(r"^[-*]\s+(.*)", line)
        if list_match:
            output.append(f"- {list_match.group(1)}")
            i += 1
            continue

        # Ordered list items: 1. 2. etc.
        ordered_match = re.match(r"^\d+\.\s+(.*)", line)
        if ordered_match:
            output.append(f"+ {ordered_match.group(1)}")
            i += 1
            continue

        # Bold (**text**) and italic (*text*)
        line = re.sub(r"\*\*(.+?)\*\*", r"*\1*", line)
        line = re.sub(r"\*(.+?)\*", r"_\1_", line)

        output.append(line)
        i += 1

    return "\n".join(output)
