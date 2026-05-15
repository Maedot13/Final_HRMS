try {
  throw new AggregateError([new Error("Connection refused")], "Network Error");
} catch(e: any) {
  console.log(e.message);
}
