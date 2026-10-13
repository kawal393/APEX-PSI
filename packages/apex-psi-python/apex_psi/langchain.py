"""LangChain / LangGraph callback: seals LLM outputs and tool calls (hash only)."""
from langchain_core.callbacks import BaseCallbackHandler
from .client import ApexPsi, _client


class ApexPsiCallbackHandler(BaseCallbackHandler):
    def __init__(self, client: ApexPsi = None):
        self.client = client or _client()

    def on_llm_end(self, response, **kw):
        self.client.seal({"event": "llm_end", "generations": [[g.text for g in gs] for gs in response.generations]}, "llm_end")

    def on_tool_end(self, output, **kw):
        self.client.seal({"event": "tool_end", "output": str(output), "name": kw.get("name")}, "tool_end")

    def on_chain_end(self, outputs, **kw):
        self.client.seal({"event": "chain_end", "outputs": outputs}, "chain_end")
