export const cFormat = (number) => {
    const cFormatter = new Intl.NumberFormat("en-US", {
        style: "decimal",
        maximumFractionDigits: 0
    })

    const num = cFormatter.format(number);
    return num;
}