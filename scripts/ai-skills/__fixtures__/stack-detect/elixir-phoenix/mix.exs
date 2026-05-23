defmodule PhoenixFixture.MixProject do
  use Mix.Project

  def project do
    [
      app: :phoenix_fixture,
      version: "0.1.0",
      elixir: "~> 1.15",
      deps: deps()
    ]
  end

  defp deps do
    [
      {:phoenix, "~> 1.7.0"},
      {:plug_cowboy, "~> 2.5"}
    ]
  end
end
