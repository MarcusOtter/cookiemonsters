<script>
	const date = new Date();
</script>

<footer>
	<p>Not legal advice. CrumblyConsent &copy; {date.getFullYear()}</p>
	<ul>
		<li>
			<a href="/github">GitHub</a>
		</li>
		<li>
			<a href="/privacy">Privacy</a>
		</li>
	</ul>
</footer>

<style>
	footer {
		padding: 2ch;
		text-align: center;
	}

	ul {
		list-style: none;
		padding: 0;
		margin-top: 1ch;
		display: flex;
		justify-content: center;
	}

	ul li {
		display: inline-block;
		margin-left: 16px;
	}

	ul li a:hover {
		text-decoration: none;
	}
</style>
