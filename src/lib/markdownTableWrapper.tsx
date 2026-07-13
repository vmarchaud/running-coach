import { ComponentPropsWithoutRef } from "react";

// typeset.css documents this exact pattern: a bare <table> shrinks/wraps its
// cells to fit (which looks broken in a narrow chat bubble on mobile — see
// the reported screenshot), while a table wrapped in .typeset-scroll widens
// to its natural size and scrolls horizontally instead. react-markdown has no
// built-in wrapper for this, so every markdown-rendering surface needs to
// pass this as its `table` component override.
export const markdownTableWrapper = {
  table: (props: ComponentPropsWithoutRef<"table">) => (
    <div className="typeset-scroll">
      <table {...props} />
    </div>
  ),
};
