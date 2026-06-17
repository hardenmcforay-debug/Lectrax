import { TableCell, TableHead } from "@/components/ui/table";
import { getSingleTestCellValue, getTestColumnLayout } from "@/lib/ca/test-columns";

const testHeadClass =
  "min-w-[6.5rem] whitespace-nowrap px-4 py-3 text-center align-middle";
const testCellClass = "px-4 py-3 text-center align-middle tabular-nums whitespace-nowrap";

export function CaTestTableHeaders({ testCount }: { testCount: number }) {
  const layout = getTestColumnLayout(testCount);

  if (layout === "split") {
    return (
      <>
        <TableHead className={testHeadClass}>Test 1</TableHead>
        <TableHead className={testHeadClass}>Test 2</TableHead>
      </>
    );
  }

  return <TableHead className={testHeadClass}>Test</TableHead>;
}

export function CaTestTableCells({
  testCount,
  test1Display,
  test2Display,
}: {
  testCount: number;
  test1Display: string;
  test2Display: string;
}) {
  const layout = getTestColumnLayout(testCount);

  if (layout === "split") {
    return (
      <>
        <TableCell className={testCellClass}>{test1Display}</TableCell>
        <TableCell className={testCellClass}>{test2Display}</TableCell>
      </>
    );
  }

  return (
    <TableCell className={testCellClass}>
      {getSingleTestCellValue(layout, test1Display)}
    </TableCell>
  );
}
